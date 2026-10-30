import hashlib
import hmac
import logging
import re
import uuid
from typing import Callable, Dict, List, Optional, Tuple

from presidio_analyzer import AnalyzerEngine, RecognizerResult
from presidio_analyzer.nlp_engine import NlpEngineProvider

from app.config import settings
from app.models import DetectedEntity, MaskResponse, PolicyMode, ThreatMatch, UnmaskResponse
from app.recognizers import get_custom_recognizers
from app.session_store import session_store
from app.threat_scanner import threat_scanner

# Ensure presidio and spacy do not emit internal debug messages containing text tokens
logging.getLogger("presidio-analyzer").setLevel(logging.INFO)
logging.getLogger("presidio-anonymizer").setLevel(logging.INFO)
logging.getLogger("spacy").setLevel(logging.INFO)

logger = logging.getLogger("aegis.pii_engine")

ALLOWED_ENTITIES = [
    "PERSON",
    "EMAIL_ADDRESS",
    "CREDIT_CARD",
    "IBAN_CODE",
    "IP_ADDRESS",
    "IN_PAN",
    "IN_AADHAAR",
    "IN_PHONE",
    "IN_UPI",
    "API_KEY",
]

DISABLED_ENTITIES = {"DATE_TIME", "LOCATION", "NRP", "URL", "PHONE_NUMBER"}

# Entity Weights for Risk Scoring
ENTITY_WEIGHTS: Dict[str, int] = {
    "PERSON": 5,
    "EMAIL_ADDRESS": 10,
    "IN_PHONE": 10,
    "IN_PAN": 25,
    "IN_AADHAAR": 30,
    "API_KEY": 40,
    "CREDIT_CARD": 35,
    "IBAN_CODE": 25,
    "IN_UPI": 20,
    "IP_ADDRESS": 10,
}

PLACEHOLDER_REGEX = re.compile(r"<([A-Z0-9_]+_\d+)>")
UNMASK_REGEX = re.compile(
    r"\[\[ESCAPED_(?P<esc>[A-Z0-9_]+_\d+)\]\]|(?P<ph><[A-Z0-9_]+_\d+>)"
)


class PIIEngine:
    def __init__(self):
        self._analyzer: Optional[AnalyzerEngine] = None

    @property
    def analyzer(self) -> AnalyzerEngine:
        if self._analyzer is None:
            self._analyzer = self._build_analyzer()
        return self._analyzer

    def _build_analyzer(self) -> AnalyzerEngine:
        # Build NLP engine explicitly using spaCy en_core_web_sm
        nlp_configuration = {
            "nlp_engine_name": "spacy",
            "models": [{"lang_code": "en", "model_name": "en_core_web_sm"}],
        }
        provider = NlpEngineProvider(nlp_configuration=nlp_configuration)
        nlp_engine = provider.create_engine()

        analyzer = AnalyzerEngine(nlp_engine=nlp_engine, supported_languages=["en"])

        # Disable DATE_TIME, LOCATION, NRP, URL, and default PHONE_NUMBER recognizers
        names_to_remove = []
        for recognizer in analyzer.registry.recognizers:
            if hasattr(recognizer, "supported_entities"):
                recognizer.supported_entities = [
                    ent for ent in recognizer.supported_entities if ent not in DISABLED_ENTITIES
                ]
                if not recognizer.supported_entities:
                    names_to_remove.append(recognizer.name)
            elif (
                hasattr(recognizer, "supported_entity")
                and recognizer.supported_entity in DISABLED_ENTITIES
            ):
                names_to_remove.append(recognizer.name)

        for name in names_to_remove:
            analyzer.registry.remove_recognizer(name)

        # Register the 5 custom domain recognizers
        for custom_recognizer in get_custom_recognizers():
            analyzer.registry.add_recognizer(custom_recognizer)

        return analyzer

    def _escape_input_text(
        self, text: str
    ) -> Tuple[str, Callable[[int], int], List[Tuple[int, int, str]]]:
        """Escape any placeholder-shaped pattern <([A-Z0-9_]+_\\d+)> into [[ESCAPED_\\1]]

        and construct an exact offset mapper back to the original coordinates.
        """
        matches = list(PLACEHOLDER_REGEX.finditer(text))
        if not matches:
            return text, lambda pos: pos, []

        segments = []
        escaped_parts = []
        user_escaped_spans = []
        curr_orig = 0
        curr_esc = 0

        for m in matches:
            s, e = m.start(), m.end()
            if s > curr_orig:
                norm_len = s - curr_orig
                segments.append((False, curr_esc, curr_esc + norm_len, curr_orig, s))
                escaped_parts.append(text[curr_orig:s])
                curr_esc += norm_len
                curr_orig = s

            esc_repl = f"[[ESCAPED_{m.group(1)}]]"
            repl_len = len(esc_repl)
            segments.append((True, curr_esc, curr_esc + repl_len, s, e))
            escaped_parts.append(esc_repl)
            user_escaped_spans.append((s, e, esc_repl))
            curr_esc += repl_len
            curr_orig = e

        if curr_orig < len(text):
            norm_len = len(text) - curr_orig
            segments.append(
                (False, curr_esc, curr_esc + norm_len, curr_orig, len(text))
            )
            escaped_parts.append(text[curr_orig:])
            curr_esc += norm_len

        escaped_text = "".join(escaped_parts)

        def map_offset(esc_pos: int) -> int:
            for is_esc, e_start, e_end, o_start, o_end in segments:
                if esc_pos <= e_end:
                    if is_esc:
                        if esc_pos == e_start:
                            return o_start
                        if esc_pos == e_end:
                            return o_end
                        ratio = (esc_pos - e_start) / (e_end - e_start)
                        return int(o_start + ratio * (o_end - o_start))
                    return o_start + (esc_pos - e_start)
            return len(text)

        return escaped_text, map_offset, user_escaped_spans

    def _resolve_overlapping_spans(
        self, results: List[RecognizerResult]
    ) -> List[RecognizerResult]:
        """Resolve overlapping spans by keeping highest confidence, longest span on ties."""
        sorted_candidates = sorted(
            results,
            key=lambda r: (r.score, (r.end - r.start), -r.start),
            reverse=True,
        )

        accepted: List[RecognizerResult] = []
        for candidate in sorted_candidates:
            has_overlap = False
            for acc in accepted:
                if not (candidate.end <= acc.start or candidate.start >= acc.end):
                    has_overlap = True
                    break
            if not has_overlap:
                accepted.append(candidate)

        return sorted(accepted, key=lambda r: r.start)

    def _build_why_masked(self, entity_type: str, score: float) -> str:
        """Construct specific, transparent explanations for detected PII entities."""
        if entity_type == "IN_PAN":
            return f"Matched 10-char alphanumeric PAN pattern [A-Z]{{5}}[0-9]{{4}}[A-Z]{{1}}; context word verified; confidence {score:.2f}"
        if entity_type == "IN_AADHAAR":
            return f"Matched 12-digit Indian Aadhaar pattern; Verhoeff checksum algorithm verified; confidence {score:.2f}"
        if entity_type == "IN_PHONE":
            return f"Matched Indian phone pattern (?<!\\d)(?:\\+91)?[6-9]\\d{{9}}; context verified; confidence {score:.2f}"
        if entity_type == "IN_UPI":
            return f"Matched UPI VPA pattern with recognized banking handle; confidence {score:.2f}"
        if entity_type == "API_KEY":
            return f"Matched high-entropy secret/token pattern; confidence {score:.2f}"
        if entity_type == "PERSON":
            return f"Identified person name entity via spaCy NER model; confidence {score:.2f}"
        if entity_type == "EMAIL_ADDRESS":
            return f"Matched standard RFC email address format; confidence {score:.2f}"
        if entity_type == "CREDIT_CARD":
            return f"Matched credit card number with Luhn checksum validation; confidence {score:.2f}"
        if entity_type == "IBAN_CODE":
            return f"Matched international bank account number (IBAN); confidence {score:.2f}"
        if entity_type == "IP_ADDRESS":
            return f"Matched network IP address pattern; confidence {score:.2f}"
        return f"Detected {entity_type} pattern with confidence {score:.2f}"

    def mask_text(
        self,
        text: str,
        policy: PolicyMode = PolicyMode.replace,
        session_id: Optional[str] = None,
    ) -> MaskResponse:
        request_id = f"req_{uuid.uuid4().hex[:12]}"
        effective_session_id = session_id or f"sess_{uuid.uuid4().hex[:12]}"

        # Step 1: Scan for security threats (injection, jailbreak, exfiltration, secrets)
        threats_detected, threat_points = threat_scanner.scan(text)

        # Step 2: Escape placeholder-shaped text in user input
        escaped_text, map_offset, user_escaped_spans = self._escape_input_text(text)

        # Step 3: Presidio PII analysis on escaped text
        raw_results = self.analyzer.analyze(
            text=escaped_text,
            language="en",
            entities=ALLOWED_ENTITIES,
            score_threshold=0.5,
        )

        # Step 4: Map offsets back to ORIGINAL text coordinates
        mapped_results: List[RecognizerResult] = []
        for res in raw_results:
            orig_s = map_offset(res.start)
            orig_e = map_offset(res.end)
            if orig_e > orig_s:
                mapped_results.append(
                    RecognizerResult(
                        entity_type=res.entity_type,
                        start=orig_s,
                        end=orig_e,
                        score=res.score,
                        analysis_explanation=res.analysis_explanation,
                        recognition_metadata=res.recognition_metadata,
                    )
                )

        # Step 5: Resolve overlapping spans
        chosen_results = self._resolve_overlapping_spans(mapped_results)

        # Step 6: Calculate risk score (entity weights + threat weights capped at 100)
        entity_points = sum(
            ENTITY_WEIGHTS.get(res.entity_type, 10) for res in chosen_results
        )
        risk_score = min(100, entity_points + threat_points)

        # Step 7: Decide action: block, mask, or allow
        # Block if risk >= 70, threat_points >= 45, or policy==block with PII/threats found
        is_blocked = (
            risk_score >= 70
            or threat_points >= 45
            or (policy == PolicyMode.block and (chosen_results or threats_detected))
        )

        if is_blocked:
            return MaskResponse(
                request_id=request_id,
                session_id=effective_session_id,
                action="block",
                policy_applied=policy,
                risk_score=risk_score,
                threats_detected=threats_detected,
                masked_text="[BLOCKED]",
                entities=[],  # Hard rule: never return PII on block
            )

        # Step 8: Generate placeholders and replacements
        detected_entities: List[DetectedEntity] = []
        pii_replacement_spans: List[Tuple[int, int, str]] = []

        for res in chosen_results:
            raw_value = text[res.start : res.end]

            if policy == PolicyMode.replace:
                placeholder = session_store.get_or_create_placeholder(
                    session_id=effective_session_id,
                    entity_type=res.entity_type,
                    raw_value=raw_value,
                )
            elif policy == PolicyMode.redact:
                clean_type = (
                    res.entity_type[3:]
                    if res.entity_type.startswith("IN_")
                    else res.entity_type
                )
                placeholder = f"[REDACTED_{clean_type}]"
            elif policy == PolicyMode.hash:
                hmac_hash = hmac.new(
                    settings.HMAC_SECRET.encode("utf-8"),
                    raw_value.encode("utf-8"),
                    hashlib.sha256,
                ).hexdigest()[:12]
                placeholder = f"<HASH_{res.entity_type}_{hmac_hash}>"
            else:
                placeholder = f"<{res.entity_type}>"

            why_text = self._build_why_masked(res.entity_type, res.score)

            detected_entities.append(
                DetectedEntity(
                    entity_type=res.entity_type,
                    placeholder=placeholder,
                    start=res.start,
                    end=res.end,
                    confidence=round(res.score, 4),
                    why_masked=why_text,
                )
            )
            pii_replacement_spans.append((res.start, res.end, placeholder))

        # Step 9: Apply replacements in reverse order on original text
        all_replacements = pii_replacement_spans + user_escaped_spans
        all_replacements.sort(key=lambda item: item[0], reverse=True)

        masked_text = text
        for start_idx, end_idx, repl_str in all_replacements:
            masked_text = (
                masked_text[:start_idx] + repl_str + masked_text[end_idx:]
            )

        # Action: mask if entities or threats detected (score >= 30 or entities present), allow otherwise
        if detected_entities or threats_detected or risk_score >= 30:
            action = "mask"
        else:
            action = "allow"

        return MaskResponse(
            request_id=request_id,
            session_id=effective_session_id,
            action=action,
            policy_applied=policy,
            risk_score=risk_score,
            threats_detected=threats_detected,
            masked_text=masked_text,
            entities=detected_entities,
        )

    def unmask_text(self, masked_text: str, session_id: str) -> UnmaskResponse:
        """Single-pass regex substitution to restore known placeholders and convert

        [[ESCAPED_X]] back to <X>. Leaves unknown placeholders untouched. Never logs raw PII.
        """
        restored_count = 0

        def replacer(match: re.Match) -> str:
            nonlocal restored_count
            esc_group = match.group("esc")
            if esc_group:
                return f"<{esc_group}>"

            ph = match.group("ph")
            if ph:
                raw_val = session_store.resolve(session_id, ph)
                if raw_val is not None:
                    restored_count += 1
                    return raw_val
                return ph

            return match.group(0)

        unmasked_result = UNMASK_REGEX.sub(replacer, masked_text)

        return UnmaskResponse(
            unmasked_text=unmasked_result,
            restored_count=restored_count,
        )


# Global singleton PII engine instance
pii_engine = PIIEngine()
