import sqlite3
import os
import hashlib
import json
from typing import Optional, List, Dict, Any

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "ecotrack.db")

def get_db_connection():
    # SQLite is lightweight, simple, and requires zero setup
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create Users table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL
    )
    """)
    
    # Create History table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        total_emissions REAL NOT NULL,
        eco_score INTEGER NOT NULL,
        raw_input TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )
    """)

    # Create Activities table for daily logging
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        action_id TEXT NOT NULL,
        points INTEGER NOT NULL,
        co2_saved REAL NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )
    """)
    
    conn.commit()
    conn.close()

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

def create_user(email: str, password: str, name: str) -> Optional[int]:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        pw_hash = hash_password(password)
        cursor.execute(
            "INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)",
            (email.lower(), pw_hash, name)
        )
        conn.commit()
        user_id = cursor.lastrowid
        return user_id
    except sqlite3.IntegrityError:
        return None # Email already exists
    finally:
        conn.close()

def verify_user(email: str, password: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    pw_hash = hash_password(password)
    cursor.execute(
        "SELECT id, email, name FROM users WHERE email = ? AND password_hash = ?",
        (email.lower(), pw_hash)
    )
    row = cursor.fetchone()
    conn.close()
    if row:
        return dict(row)
    return None

def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, email, name FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return dict(row)
    return None

def add_history_entry(user_id: int, date: str, total_emissions: float, eco_score: int, raw_input: Dict[str, Any]) -> int:
    conn = get_db_connection()
    cursor = conn.cursor()
    raw_input_str = json.dumps(raw_input)
    cursor.execute(
        "INSERT INTO history (user_id, date, total_emissions, eco_score, raw_input) VALUES (?, ?, ?, ?, ?)",
        (user_id, date, total_emissions, eco_score, raw_input_str)
    )
    conn.commit()
    entry_id = cursor.lastrowid
    conn.close()
    return entry_id

def get_user_history(user_id: int) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, date, total_emissions, eco_score, raw_input FROM history WHERE user_id = ? ORDER BY id ASC",
        (user_id,)
    )
    rows = cursor.fetchall()
    conn.close()
    
    entries = []
    for r in rows:
        d = dict(r)
        d["raw_input"] = json.loads(d["raw_input"])
        entries.append(d)
    return entries

def clear_user_history(user_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM history WHERE user_id = ?", (user_id,))
    conn.commit()
    conn.close()

# --- ACTIVITY LOGGER OPERATIONS ---

def add_activity(user_id: int, date: str, action_id: str, points: int, co2_saved: float) -> int:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO activities (user_id, date, action_id, points, co2_saved) VALUES (?, ?, ?, ?, ?)",
        (user_id, date, action_id, points, co2_saved)
    )
    conn.commit()
    act_id = cursor.lastrowid
    conn.close()
    return act_id

def get_activities(user_id: int) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, date, action_id, points, co2_saved FROM activities WHERE user_id = ? ORDER BY id DESC",
        (user_id,)
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def delete_activity(user_id: int, activity_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM activities WHERE user_id = ? AND id = ?", (user_id, activity_id))
    conn.commit()
    conn.close()

def clear_activities(user_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM activities WHERE user_id = ?", (user_id,))
    conn.commit()
    conn.close()
