import time
from enum import Enum
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, ConfigDict, Field


class PolicyMode(str, Enum):
    replace = "replace"
    redact = "redact"
    hash = "hash"
    block = "block"


class MaskRequest(BaseModel):
    text: str = Field(..., max_length=20000, description="Input text to scan and mask (max length 20,000)")
    policy: PolicyMode = Field(default=PolicyMode.replace, description="Masking policy to apply")
    session_id: Optional[str] = Field(default=None, description="Session ID for consistent pseudonymization")


class DetectedEntity(BaseModel):
    entity_type: str
    placeholder: str
    start: int
    end: int
    confidence: float
    why_masked: str


class ThreatMatch(BaseModel):
    name: str
    category: str
    reason: str


class MaskResponse(BaseModel):
    request_id: str
    session_id: str
    action: str  # "allow", "mask", "block"
    policy_applied: PolicyMode
    risk_score: int = Field(default=0, ge=0, le=100)
    threat_points: int = 0
    pii_points: int = 0
    threats_detected: List[ThreatMatch] = Field(default_factory=list)
    masked_text: str
    entities: List[DetectedEntity] = Field(default_factory=list)


class UnmaskRequest(BaseModel):
    masked_text: str
    session_id: str


class UnmaskResponse(BaseModel):
    unmasked_text: str
    restored_count: int


class AuditEntry(BaseModel):
    request_id: str
    session_id: str = ""
    timestamp: float
    timestamp_iso: str = ""
    role: str
    endpoint: str = "/api/v1/mask"
    policy: str
    risk_score: int
    action: str
    entity_counts: Dict[str, int] = Field(default_factory=dict)
    entity_types: List[str] = Field(default_factory=list)
    entity_count: int = 0
    placeholders: List[str] = Field(default_factory=list)
    threat_names: List[str] = Field(default_factory=list)
    threats: List[str] = Field(default_factory=list)
    output_scan_flagged: bool = False


# OpenAI-compatible Chat Completion Schemas

class ChatCompletionMessage(BaseModel):
    role: str
    content: Optional[Union[str, Any]] = ""


class ChatCompletionRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    model: str = "llama-3.3-70b-versatile"
    messages: List[ChatCompletionMessage]
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    top_p: Optional[float] = None
    stream: Optional[bool] = False


class AegisSecurityMetadata(BaseModel):
    request_id: str
    session_id: str
    action: str
    policy_applied: str
    risk_score: int
    threat_points: int = 0
    pii_points: int = 0
    prompt_sent_to_llm: str
    raw_llm_output: str
    llm_mode: str = "mock"
    model_used: str = "llama-3.3-70b-versatile"
    is_live_groq: bool = False
    output_scan_passed: bool
    output_scan_findings: List[str] = Field(default_factory=list)
    restored_for_role: Optional[str] = None
    entities: List[DetectedEntity] = Field(default_factory=list)
    threats_detected: List[ThreatMatch] = Field(default_factory=list)


class ChatCompletionChoice(BaseModel):
    index: int = 0
    message: ChatCompletionMessage
    finish_reason: Optional[str] = "stop"


class ChatCompletionUsage(BaseModel):
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


class ChatCompletionResponse(BaseModel):
    id: str
    object: str = "chat.completion"
    created: int = Field(default_factory=lambda: int(time.time()))
    model: str
    choices: List[ChatCompletionChoice]
    usage: ChatCompletionUsage = Field(default_factory=ChatCompletionUsage)
    aegis_security: AegisSecurityMetadata


class ModelItem(BaseModel):
    id: str
    object: str = "model"
    created: int = 1700000000
    owned_by: str = "groq"


class ModelListResponse(BaseModel):
    object: str = "list"
    data: List[ModelItem]
