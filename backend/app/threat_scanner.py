import logging
import re
from dataclasses import dataclass
from typing import List, Optional, Tuple

from app.config import settings
from app.models import ThreatMatch

logger = logging.getLogger("aegis.threat_scanner")


@dataclass
class ThreatRule:
    name: str
    category: str
    weight: int
    reason: str
    pattern: re.Pattern


# Explicit Threat Categories and Weights
RULES: List[ThreatRule] = [
    # 1. Prompt Injection
    ThreatRule(
        name="instruction_override",
        category="prompt_injection",
        weight=45,
        reason="Detected prompt injection attempt attempting to ignore or override prior instructions.",
        pattern=re.compile(
            r"(?i)\b(?:ignore|disregard|forget|override)\s+(?:all\s+)?(?:previous|prior|above)\s+instructions?\b"
        ),
    ),
    ThreatRule(
        name="system_prompt_reveal",
        category="prompt_injection",
        weight=45,
        reason="Detected prompt injection attempting to reveal or extract the internal system prompt.",
        pattern=re.compile(
            r"(?i)\b(?:reveal|show|display|print|leak|output)\s+(?:the\s+)?(?:system\s+prompt|initial\s+prompt|system\s+instructions?)\b"
        ),
    ),
    ThreatRule(
        name="god_mode_override",
        category="prompt_injection",
        weight=45,
        reason="Detected persona override attempt claiming unrestricted or god mode privileges.",
        pattern=re.compile(
            r"(?i)\b(?:you\s+are\s+now\s+in|enable|activate)\s+(?:god\s+mode|unrestricted\s+mode)\b"
        ),
    ),
    # 2. Jailbreak Patterns
    ThreatRule(
        name="dan_jailbreak",
        category="jailbreak",
        weight=45,
        reason="Detected DAN (Do Anything Now) jailbreak signature attempting to bypass guardrails.",
        pattern=re.compile(
            r"(?i)\bDAN\s+(?:mode|jailbreak|prompt)?\b|\bDo\s+Anything\s+Now\b"
        ),
    ),
    ThreatRule(
        name="developer_mode_jailbreak",
        category="jailbreak",
        weight=45,
        reason="Detected developer mode jailbreak pattern simulating unaligned assistant behaviors.",
        pattern=re.compile(
            r"(?i)\b(?:enable|enter|switch\s+to)\s+developer\s+mode\b"
        ),
    ),
    # 3. Data Exfiltration
    ThreatRule(
        name="http_data_exfiltration",
        category="data_exfiltration",
        weight=40,
        reason="Detected command attempting to exfiltrate session data to an external HTTP endpoint.",
        pattern=re.compile(
            r"(?i)\b(?:send|post|transmit|curl|fetch|wget)\s+(?:all\s+.*?\s+to\s+|data\s+to\s+|to\s+)?https?://[^\s]+"
        ),
    ),
    ThreatRule(
        name="base64_encode_exfiltration",
        category="data_exfiltration",
        weight=40,
        reason="Detected instruction attempting to base64 encode conversation history for exfiltration.",
        pattern=re.compile(
            r"(?i)\bbase64\s+(?:encode|dump|output)\s+(?:the\s+)?(?:above|previous|system|conversation)\b"
        ),
    ),
    ThreatRule(
        name="markdown_image_exfiltration",
        category="data_exfiltration",
        weight=40,
        reason="Detected markdown image syntax commonly used for rendering-based data exfiltration.",
        pattern=re.compile(r"!\[.*?\]\(https?://[^\s\)]+\)"),
    ),
    # 4. Secret Leak (reuses API key pattern)
    ThreatRule(
        name="secret_key_leak",
        category="secret_leak",
        weight=25,
        reason="Detected sensitive API key or token pattern exposed in text payload.",
        pattern=re.compile(
            r"\b(?:sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{36}|AIza[0-9A-Za-z\-_]{35}|AKIA[0-9A-Z]{16})\b"
        ),
    ),
]


class ThreatScanner:
    """Multi-layer threat detection engine combining high-speed regex rules

    and an optional lazy-loaded Hugging Face ML classifier.
    """

    def __init__(self):
        self._ml_pipeline = None
        self._ml_loaded = False

    def _get_ml_pipeline(self):
        if not settings.ENABLE_ML_DETECTOR:
            return None
        if self._ml_loaded:
            return self._ml_pipeline

        self._ml_loaded = True
        try:
            import httpx
            # Verify model existence on Hugging Face before loading
            model_id = "fmops/distilbert-prompt-injection"
            check_url = f"https://huggingface.co/api/models/{model_id}"
            try:
                res = httpx.head(check_url, timeout=3.0)
                if res.status_code >= 400:
                    logger.warning(f"ML model {model_id} not available on Hugging Face (status {res.status_code})")
                    return None
            except Exception:
                # Network check failed; fall back safely
                return None

            from transformers import pipeline
            self._ml_pipeline = pipeline("text-classification", model=model_id)
            logger.info(f"Loaded ML prompt injection model: {model_id}")
            return self._ml_pipeline
        except Exception as e:
            logger.warning(f"Could not load ML prompt-injection classifier: {e}. Falling back to regex-only.")
            self._ml_pipeline = None
            return None

    def scan(self, text: str) -> Tuple[List[ThreatMatch], int]:
        """Scan input text against regex rules and optional ML classifier.

        Returns:
            threats: List of ThreatMatch objects
            threat_points: Total threat score weight
        """
        threats: List[ThreatMatch] = []
        threat_points = 0
        matched_categories = set()

        for rule in RULES:
            if rule.pattern.search(text):
                threats.append(
                    ThreatMatch(
                        name=rule.name,
                        category=rule.category,
                        reason=rule.reason,
                    )
                )
                threat_points += rule.weight
                matched_categories.add(rule.category)

        # Optional ML layer
        ml_pipe = self._get_ml_pipeline()
        if ml_pipe is not None and "prompt_injection" not in matched_categories:
            try:
                # Never send text to external services; local pipeline inference only
                result = ml_pipe(text[:512])[0]
                label = result.get("label", "").lower()
                score = float(result.get("score", 0.0))
                if ("injection" in label or label == "label_1") and score >= 0.70:
                    threats.append(
                        ThreatMatch(
                            name="ml_injection_detector",
                            category="ml_injection_detector",
                            reason=f"ML prompt-injection classifier triggered (confidence: {score:.2f})",
                        )
                    )
                    threat_points += 50
            except Exception as e:
                logger.debug(f"ML detection evaluation error: {e}")

        return threats, threat_points


threat_scanner = ThreatScanner()
