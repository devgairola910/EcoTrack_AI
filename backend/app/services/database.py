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

    # Create User Challenges table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS user_challenges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        challenge_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        points INTEGER NOT NULL,
        co2_saved REAL NOT NULL,
        status TEXT NOT NULL,
        start_date TEXT,
        completed_date TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id),
        UNIQUE(user_id, challenge_id)
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

# --- WEEKLY CHALLENGES OPERATIONS ---

def get_user_challenges(user_id: int) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, challenge_id, title, description, points, co2_saved, status, start_date, completed_date FROM user_challenges WHERE user_id = ?",
        (user_id,)
    )
    rows = cursor.fetchall()
    
    # If no challenges exist, seed them for the user
    if not rows:
        default_challenges = [
            ("zero_waste", "Zero-Waste Hero", "Avoid all single-use plastics for 5 days.", 50, 2.5),
            ("pedal_power", "Pedal Power", "Commute via bike or walk for at least 15 km.", 80, 12.0),
            ("power_down", "Power Down", "Unplug all standby electronic appliances before going to sleep.", 40, 3.2),
            ("green_chef", "Green Chef", "Cook 5 consecutive plant-based lunches or dinners.", 60, 9.5)
        ]
        for cid, title, desc, pts, co2 in default_challenges:
            try:
                cursor.execute(
                    "INSERT INTO user_challenges (user_id, challenge_id, title, description, points, co2_saved, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    (user_id, cid, title, desc, pts, co2, "available")
                )
            except sqlite3.IntegrityError:
                pass
        conn.commit()
        
        # Refetch
        cursor.execute(
            "SELECT id, challenge_id, title, description, points, co2_saved, status, start_date, completed_date FROM user_challenges WHERE user_id = ?",
            (user_id,)
        )
        rows = cursor.fetchall()
        
    conn.close()
    return [dict(r) for r in rows]

def update_user_challenge_status(user_id: int, challenge_id: str, status: str, completed_date: Optional[str] = None) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if challenge exists for user
    cursor.execute("SELECT id FROM user_challenges WHERE user_id = ? AND challenge_id = ?", (user_id, challenge_id))
    row = cursor.fetchone()
    
    if not row:
        # Seed challenges first
        conn.close()
        get_user_challenges(user_id)
        conn = get_db_connection()
        cursor = conn.cursor()
        
    import datetime
    if status == "completed":
        date_str = completed_date or datetime.date.today().strftime("%Y-%m-%d")
        cursor.execute(
            "UPDATE user_challenges SET status = ?, completed_date = ? WHERE user_id = ? AND challenge_id = ?",
            (status, date_str, user_id, challenge_id)
        )
    elif status == "active":
        date_str = datetime.date.today().strftime("%Y-%m-%d")
        cursor.execute(
            "UPDATE user_challenges SET status = ?, start_date = ? WHERE user_id = ? AND challenge_id = ?",
            (status, date_str, user_id, challenge_id)
        )
    else:
        cursor.execute(
            "UPDATE user_challenges SET status = ? WHERE user_id = ? AND challenge_id = ?",
            (status, user_id, challenge_id)
        )
        
    conn.commit()
    rows_affected = cursor.rowcount
    conn.close()
    return rows_affected > 0

def clear_user_challenges(user_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM user_challenges WHERE user_id = ?", (user_id,))
    conn.commit()
    conn.close()
