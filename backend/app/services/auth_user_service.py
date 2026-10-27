import logging
import sqlite3
from typing import Optional, Tuple

from app.db.auth_db import get_connection
from app.core.security import hash_password, verify_password

logger = logging.getLogger(__name__)


def get_user_by_email(email: str) -> Optional[sqlite3.Row]:
    with get_connection() as conn:
        cur = conn.execute(
            "SELECT id, email, password_hash, google_sub FROM users WHERE email = ? LIMIT 1",
            (email.strip().lower(),),
        )
        return cur.fetchone()


def get_user_by_id(user_id: int) -> Optional[sqlite3.Row]:
    with get_connection() as conn:
        cur = conn.execute(
            "SELECT id, email, password_hash, google_sub FROM users WHERE id = ? LIMIT 1",
            (user_id,),
        )
        return cur.fetchone()


def get_user_by_google_sub(google_sub: str) -> Optional[sqlite3.Row]:
    with get_connection() as conn:
        cur = conn.execute(
            "SELECT id, email, password_hash, google_sub FROM users WHERE google_sub = ? LIMIT 1",
            (google_sub,),
        )
        return cur.fetchone()


def create_email_user(email: str, password: str) -> int:
    ph = hash_password(password)
    with get_connection() as conn:
        cur = conn.execute(
            "INSERT INTO users (email, password_hash, google_sub) VALUES (?, ?, NULL)",
            (email.strip().lower(), ph),
        )
        conn.commit()
        return int(cur.lastrowid)


def link_google_sub(user_id: int, google_sub: str) -> None:
    with get_connection() as conn:
        conn.execute(
            "UPDATE users SET google_sub = ? WHERE id = ? AND google_sub IS NULL",
            (google_sub, user_id),
        )
        conn.commit()


def create_google_user(email: str, google_sub: str) -> int:
    with get_connection() as conn:
        cur = conn.execute(
            "INSERT INTO users (email, password_hash, google_sub) VALUES (?, NULL, ?)",
            (email.strip().lower(), google_sub),
        )
        conn.commit()
        return int(cur.lastrowid)


def authenticate_email_password(email: str, password: str) -> Optional[int]:
    row = get_user_by_email(email)
    if not row or not row["password_hash"]:
        return None
    if not verify_password(password, row["password_hash"]):
        return None
    return int(row["id"])


def register_email_user(email: str, password: str) -> Tuple[bool, str]:
    try:
        create_email_user(email, password)
        return True, "ok"
    except sqlite3.IntegrityError:
        logger.info("Registration conflict for email")
        return False, "conflict"
