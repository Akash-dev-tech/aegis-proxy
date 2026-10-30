from typing import List, Optional
from presidio_analyzer import Pattern, PatternRecognizer

# Verhoeff algorithm multiplication table
_D_TABLE = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
    [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
    [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
    [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
    [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
    [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
    [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
    [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
    [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
]

# Verhoeff algorithm permutation table
_P_TABLE = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
    [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
    [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
    [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
    [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
    [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
    [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
]


def validate_verhoeff(num_str: str) -> bool:
    """Validate number string using the Verhoeff checksum algorithm."""
    digits = [int(ch) for ch in num_str if ch.isdigit()]
    if not digits:
        return False
    c = 0
    for i, digit in enumerate(reversed(digits)):
        c = _D_TABLE[c][_P_TABLE[i % 8][digit]]
    return c == 0


class InPanRecognizer(PatternRecognizer):
    def __init__(self):
        patterns = [
            Pattern(
                name="in_pan_pattern",
                regex=r"\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b",
                score=0.90,
            )
        ]
        super().__init__(
            supported_entity="IN_PAN",
            patterns=patterns,
            context=["pan", "tax", "income"],
            supported_language="en",
        )


class InAadhaarRecognizer(PatternRecognizer):
    def __init__(self):
        patterns = [
            Pattern(
                name="in_aadhaar_pattern",
                regex=r"\b[2-9][0-9]{3}\s?[0-9]{4}\s?[0-9]{4}\b",
                score=0.85,
            )
        ]
        super().__init__(
            supported_entity="IN_AADHAAR",
            patterns=patterns,
            context=["aadhaar", "aadhar", "uidai", "uid"],
            supported_language="en",
        )

    def validate_result(self, pattern_text: str) -> bool:
        cleaned = "".join(ch for ch in pattern_text if ch.isdigit())
        if len(cleaned) != 12:
            return False
        return validate_verhoeff(cleaned)


class InPhoneRecognizer(PatternRecognizer):
    def __init__(self):
        patterns = [
            Pattern(
                name="in_phone_pattern",
                regex=r"(?<!\d)(?:\+91[\-\s]?|0)?[6-9]\d{9}(?!\d)",
                score=0.85,
            )
        ]
        super().__init__(
            supported_entity="IN_PHONE",
            patterns=patterns,
            context=["phone", "mobile", "call", "whatsapp", "contact"],
            supported_language="en",
        )


class InUpiRecognizer(PatternRecognizer):
    def __init__(self):
        patterns = [
            Pattern(
                name="in_upi_pattern",
                regex=r"\b[a-zA-Z0-9.\-_]{2,256}@(?:okaxis|okhdfcbank|okicici|oksbi|ybl|paytm|ibl|axl|upi)\b",
                score=0.95,
            )
        ]
        super().__init__(
            supported_entity="IN_UPI",
            patterns=patterns,
            context=["upi", "vpa", "gpay", "phonepe", "paytm"],
            supported_language="en",
        )


class ApiKeyRecognizer(PatternRecognizer):
    def __init__(self):
        patterns = [
            Pattern(
                name="api_key_pattern",
                regex=r"\b(?:sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{36}|AIza[0-9A-Za-z\-_]{35}|AKIA[0-9A-Z]{16})\b",
                score=0.95,
            )
        ]
        super().__init__(
            supported_entity="API_KEY",
            patterns=patterns,
            context=["key", "token", "secret", "bearer", "api"],
            supported_language="en",
        )


def get_custom_recognizers() -> List[PatternRecognizer]:
    """Return instances of all 5 custom recognizers."""
    return [
        InPanRecognizer(),
        InAadhaarRecognizer(),
        InPhoneRecognizer(),
        InUpiRecognizer(),
        ApiKeyRecognizer(),
    ]
