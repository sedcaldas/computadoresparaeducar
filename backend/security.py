import hashlib
import os
import secrets
import hmac
import time
from typing import Optional, Dict, Any

SECRET_KEY = os.environ.get("GESTION_DOC_SECRET", "caldas-computadoresparaeducar-super-secret-key-2026")

def generate_salt(length: int = 16) -> str:
    return secrets.token_hex(length)

def hash_password(password: str, salt: str) -> str:
    # PBKDF2 with HMAC-SHA256, 100,000 iterations
    pwd_bytes = password.encode('utf-8')
    salt_bytes = salt.encode('utf-8')
    dk = hashlib.pbkdf2_hmac('sha256', pwd_bytes, salt_bytes, 100000)
    return dk.hex()

def verify_password(password: str, salt: str, expected_hash: str) -> bool:
    actual_hash = hash_password(password, salt)
    return hmac.compare_digest(actual_hash, expected_hash)

# Simple signed token implementation without requiring external JWT lib
def create_access_token(data: Dict[str, Any], expires_in: int = 86400) -> str:
    payload = dict(data)
    payload["exp"] = int(time.time()) + expires_in
    import json
    import base64
    payload_json = json.dumps(payload, separators=(',', ':'), sort_keys=True).encode('utf-8')
    b64_payload = base64.urlsafe_b64encode(payload_json).decode('utf-8').rstrip('=')
    signature = hmac.new(SECRET_KEY.encode('utf-8'), b64_payload.encode('utf-8'), hashlib.sha256).hexdigest()
    return f"{b64_payload}.{signature}"

def verify_access_token(token: str) -> Optional[Dict[str, Any]]:
    if not token or '.' not in token:
        return None
    try:
        b64_payload, signature = token.split('.', 1)
        expected_sig = hmac.new(SECRET_KEY.encode('utf-8'), b64_payload.encode('utf-8'), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected_sig):
            return None
        import json
        import base64
        # Add padding back if necessary
        padded = b64_payload + '=' * (-len(b64_payload) % 4)
        payload_json = base64.urlsafe_b64decode(padded.encode('utf-8')).decode('utf-8')
        payload = json.loads(payload_json)
        if payload.get("exp", 0) < time.time():
            return None
        return payload
    except Exception:
        return None
