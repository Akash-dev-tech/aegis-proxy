import logging
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.rate_limit import rate_limiter
from app.session_store import session_store

client = TestClient(app)

ADMIN_HEADERS = {"X-API-Key": "demo-admin-key"}
VIEWER_HEADERS = {"X-API-Key": "demo-viewer-key"}


@pytest.fixture(autouse=True)
def clean_store():
    # Clear session store and rate limiter before each test
    rate_limiter.clear()
    session_store._raw_to_placeholder.clear()
    session_store._placeholder_to_raw.clear()
    session_store._entity_counters.clear()
    session_store._last_accessed.clear()
    yield


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["spacy_model"] == "en_core_web_sm"
    assert "vault_active_sessions" in data


def test_entity_types_masked():
    # 1. PERSON & EMAIL
    res = client.post(
        "/api/v1/mask",
        headers=ADMIN_HEADERS,
        json={"text": "Hello, my name is Rahul Sharma and email is test@example.com"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "<PERSON_1>" in data["masked_text"]
    assert "<EMAIL_ADDRESS_1>" in data["masked_text"]
    assert "Rahul Sharma" not in data["masked_text"]
    assert "test@example.com" not in data["masked_text"]

    # 2. IN_PAN
    res = client.post(
        "/api/v1/mask",
        headers=ADMIN_HEADERS,
        json={"text": "PAN card is ABCDE1234F for tax purposes"},
    )
    assert res.status_code == 200
    assert "<IN_PAN_1>" in res.json()["masked_text"]
    assert "ABCDE1234F" not in res.json()["masked_text"]

    # 3. IN_AADHAAR (Valid Verhoeff checksum)
    # 234567890124 is a valid Verhoeff Aadhaar
    res = client.post(
        "/api/v1/mask",
        headers=ADMIN_HEADERS,
        json={"text": "My aadhaar number is 2345 6789 0124 registered with uidai"},
    )
    assert res.status_code == 200
    assert "<IN_AADHAAR_1>" in res.json()["masked_text"]

    # 4. IN_AADHAAR (Invalid Verhoeff checksum) - must NOT be masked as Aadhaar
    res = client.post(
        "/api/v1/mask",
        headers=ADMIN_HEADERS,
        json={"text": "Fake aadhaar number is 2345 6789 0125 rejected"},
    )
    assert res.status_code == 200
    assert "<IN_AADHAAR_1>" not in res.json()["masked_text"]

    # 5. IN_PHONE
    res = client.post(
        "/api/v1/mask",
        headers=ADMIN_HEADERS,
        json={"text": "Please call +919876543210 regarding the invoice"},
    )
    assert res.status_code == 200
    assert "<IN_PHONE_1>" in res.json()["masked_text"]
    assert "+919876543210" not in res.json()["masked_text"]

    # 6. IN_UPI
    res = client.post(
        "/api/v1/mask",
        headers=ADMIN_HEADERS,
        json={"text": "Transfer money to merchant.bills@okhdfcbank right now"},
    )
    assert res.status_code == 200
    assert "<IN_UPI_1>" in res.json()["masked_text"]
    assert "merchant.bills@okhdfcbank" not in res.json()["masked_text"]

    # 7. API_KEY
    res = client.post(
        "/api/v1/mask",
        headers=ADMIN_HEADERS,
        json={"text": "Here is the api key sk-1234567890abcdef1234567890 for testing"},
    )
    assert res.status_code == 200
    assert "<API_KEY_1>" in res.json()["masked_text"]
    assert "sk-1234567890abcdef1234567890" not in res.json()["masked_text"]


def test_session_consistency():
    # Same value within a session -> same placeholder
    res1 = client.post(
        "/api/v1/mask",
        headers=ADMIN_HEADERS,
        json={
            "text": "Rahul Sharma went to market. Later Rahul Sharma came home.",
            "session_id": "session_alpha",
        },
    )
    assert res1.status_code == 200
    masked = res1.json()["masked_text"]
    assert masked.count("<PERSON_1>") == 2
    assert "<PERSON_2>" not in masked

    # Different session -> gets independent counter
    res2 = client.post(
        "/api/v1/mask",
        headers=ADMIN_HEADERS,
        json={
            "text": "Rahul Sharma called today.",
            "session_id": "session_beta",
        },
    )
    assert res2.status_code == 200
    assert "<PERSON_1>" in res2.json()["masked_text"]


def test_auth_and_role_downgrade():
    # Missing key -> 401
    res = client.post("/api/v1/mask", json={"text": "Hello"})
    assert res.status_code == 401

    # Invalid key -> 401
    res = client.post(
        "/api/v1/mask",
        headers={"X-API-Key": "wrong-key"},
        json={"text": "Hello"},
    )
    assert res.status_code == 401

    # Viewer can call /mask
    res = client.post(
        "/api/v1/mask",
        headers=VIEWER_HEADERS,
        json={"text": "Hello world with pan ABCDE1234F"},
    )
    assert res.status_code == 200

    # Viewer cannot call /unmask -> 403
    res = client.post(
        "/api/v1/unmask",
        headers=VIEWER_HEADERS,
        json={"masked_text": "Hello <IN_PAN_1>", "session_id": "s1"},
    )
    assert res.status_code == 403

    # Viewer cannot upgrade via X-User-Role: admin -> still 403
    res = client.post(
        "/api/v1/unmask",
        headers={**VIEWER_HEADERS, "X-User-Role": "admin"},
        json={"masked_text": "Hello <IN_PAN_1>", "session_id": "s1"},
    )
    assert res.status_code == 403

    # Admin can downgrade via X-User-Role: viewer -> 403 on unmask
    res = client.post(
        "/api/v1/unmask",
        headers={**ADMIN_HEADERS, "X-User-Role": "viewer"},
        json={"masked_text": "Hello <IN_PAN_1>", "session_id": "s1"},
    )
    assert res.status_code == 403

    # Admin can unmask -> 200
    res_mask = client.post(
        "/api/v1/mask",
        headers=ADMIN_HEADERS,
        json={"text": "My pan is ABCDE1234F", "session_id": "s_admin"},
    )
    masked_text = res_mask.json()["masked_text"]

    res_unmask = client.post(
        "/api/v1/unmask",
        headers=ADMIN_HEADERS,
        json={"masked_text": masked_text, "session_id": "s_admin"},
    )
    assert res_unmask.status_code == 200
    assert res_unmask.json()["unmasked_text"] == "My pan is ABCDE1234F"
    assert res_unmask.json()["restored_count"] == 1


def test_unknown_placeholder_untouched():
    res = client.post(
        "/api/v1/unmask",
        headers=ADMIN_HEADERS,
        json={"masked_text": "Hello <PERSON_99> and <IN_PAN_99>", "session_id": "s_unknown"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["unmasked_text"] == "Hello <PERSON_99> and <IN_PAN_99>"
    assert data["restored_count"] == 0


def test_user_typed_placeholder_escaped_and_safe():
    # User types a placeholder-like string "<PERSON_1>"
    text = "Talk to <PERSON_1> about Rahul Sharma right now"
    res = client.post(
        "/api/v1/mask",
        headers=ADMIN_HEADERS,
        json={"text": text, "session_id": "s_escape"},
    )
    assert res.status_code == 200
    masked = res.json()["masked_text"]

    # User's <PERSON_1> was escaped to [[ESCAPED_PERSON_1]]
    assert "[[ESCAPED_PERSON_1]]" in masked
    # Rahul Sharma was assigned a placeholder
    assert "<PERSON_1>" in masked

    # Unmasking restores Rahul Sharma AND un-escapes [[ESCAPED_PERSON_1]] back to <PERSON_1>
    res_unmask = client.post(
        "/api/v1/unmask",
        headers=ADMIN_HEADERS,
        json={"masked_text": masked, "session_id": "s_escape"},
    )
    assert res_unmask.status_code == 200
    unmasked = res_unmask.json()["unmasked_text"]
    assert unmasked == "Talk to <PERSON_1> about Rahul Sharma right now"
    # Restored count is 1 (only Rahul Sharma was unmasked from the session vault)
    assert res_unmask.json()["restored_count"] == 1


def test_offsets_match_original_text():
    # Even with user-escaped placeholders preceding PII, offsets MUST point to original text
    text = "Check <PERSON_1> details: PAN ABCDE1234F and email contact@aegis.ai"
    res = client.post(
        "/api/v1/mask",
        headers=ADMIN_HEADERS,
        json={"text": text},
    )
    assert res.status_code == 200
    entities = res.json()["entities"]

    assert len(entities) >= 2
    for ent in entities:
        orig_slice = text[ent["start"] : ent["end"]]
        if ent["entity_type"] == "IN_PAN":
            assert orig_slice == "ABCDE1234F"
        elif ent["entity_type"] == "EMAIL_ADDRESS":
            assert orig_slice == "contact@aegis.ai"


def test_hash_policy_deterministic():
    text = "Employee ABCDE1234F reported yesterday"
    res1 = client.post(
        "/api/v1/mask",
        headers=ADMIN_HEADERS,
        json={"text": text, "policy": "hash"},
    )
    assert res1.status_code == 200
    m1 = res1.json()["masked_text"]
    assert "<HASH_IN_PAN_" in m1
    assert "ABCDE1234F" not in m1

    res2 = client.post(
        "/api/v1/mask",
        headers=ADMIN_HEADERS,
        json={"text": text, "policy": "hash"},
    )
    assert res2.status_code == 200
    m2 = res2.json()["masked_text"]

    # Deterministic: same text and HMAC secret produce identical hash placeholder
    assert m1 == m2


def test_block_policy():
    # When PII is detected with policy=block, return action="block" with zero PII
    res = client.post(
        "/api/v1/mask",
        headers=ADMIN_HEADERS,
        json={"text": "Here is PAN ABCDE1234F", "policy": "block"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["action"] == "block"
    assert data["entities"] == []
    assert "ABCDE1234F" not in data["masked_text"]

    # When no PII is detected with policy=block, return action="allow"
    res_clean = client.post(
        "/api/v1/mask",
        headers=ADMIN_HEADERS,
        json={"text": "Clean system check without any pii", "policy": "block"},
    )
    assert res_clean.status_code == 200
    data_clean = res_clean.json()
    assert data_clean["action"] == "allow"
    assert data_clean["entities"] == []


def test_no_raw_pii_in_logs(caplog):
    caplog.set_level(logging.DEBUG)
    logging.getLogger("presidio-analyzer").setLevel(logging.INFO)
    logging.getLogger("presidio-anonymizer").setLevel(logging.INFO)
    logging.getLogger("spacy").setLevel(logging.INFO)

    secret_pan = "WXYZK9876Q"
    secret_email = "supersecret_log_test@example.com"

    res = client.post(
        "/api/v1/mask",
        headers=ADMIN_HEADERS,
        json={"text": f"Confidential pan {secret_pan} and email {secret_email}"},
    )
    assert res.status_code == 200

    masked = res.json()["masked_text"]
    res_unmask = client.post(
        "/api/v1/unmask",
        headers=ADMIN_HEADERS,
        json={"masked_text": masked, "session_id": res.json()["session_id"]},
    )
    assert res_unmask.status_code == 200

    # Ensure captured logs contain neither secret PAN nor secret email
    assert secret_pan not in caplog.text
    assert secret_email not in caplog.text
