import sqlite3
import os
import hashlib
import json
import secrets
from typing import Optional, List, Dict, Any

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "ecotrack.db")

def get_db_connection() -> sqlite3.Connection:
    """
    Establish a connection to the SQLite database.

    Configures the connection to return sqlite3.Row rows for dictionary access.

    Returns:
        sqlite3.Connection: Database connection object.
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db() -> None:
    """
    Initialize the SQLite database schema.

    Creates users, history, activities, and user_challenges tables if they
    do not already exist.
    """
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
    """
    Hash a user's password using PBKDF2-HMAC-SHA256 with a unique random salt.

    Generates a 16-byte hex-encoded salt and derives the key over 100,000 iterations.
    Returns the string format 'salt:derived_key_hex'.

    Args:
        password (str): Plain text password input.

    Returns:
        str: Salt and key pair separated by a colon.
    """
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    )
    return f"{salt}:{key.hex()}"

def verify_password(password: str, hashed_password: str) -> bool:
    """
    Verify a user's password against a stored PBKDF2-HMAC-SHA256 or legacy SHA-256 hash.

    Utilizes constant-time verification to prevent timing attacks.

    Args:
        password (str): Plain text password input.
        hashed_password (str): Stored hash from the database.

    Returns:
        bool: True if password matches, False otherwise.
    """
    try:
        if ":" not in hashed_password:
            # Fallback compatibility for legacy SHA-256 hashes
            old_hash = hashlib.sha256(password.encode("utf-8")).hexdigest()
            return secrets.compare_digest(old_hash.encode("utf-8"), hashed_password.encode("utf-8"))
            
        salt, key_hex = hashed_password.split(":", 1)
        expected_key = bytes.fromhex(key_hex)
        key = hashlib.pbkdf2_hmac(
            'sha256',
            password.encode('utf-8'),
            salt.encode('utf-8'),
            100000
        )
        return secrets.compare_digest(key, expected_key)
    except Exception:
        return False

def create_user(email: str, password: str, name: str) -> Optional[int]:
    """
    Register a new user in the database.

    Secures the password using PBKDF2-HMAC-SHA256 before insertion.

    Args:
        email (str): The user's unique email.
        password (str): Plain text password.
        name (str): Display name of the user.

    Returns:
        Optional[int]: The inserted user ID, or None if the email already exists.
    """
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
        return None  # Email already exists
    finally:
        conn.close()

def verify_user(email: str, password: str) -> Optional[Dict[str, Any]]:
    """
    Authenticate a user using their email and password credentials.

    Args:
        email (str): The login email address.
        password (str): Plain text password credentials.

    Returns:
        Optional[Dict[str, Any]]: User profile details (id, email, name) if authenticated, else None.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, email, name, password_hash FROM users WHERE email = ?",
        (email.lower(),)
    )
    row = cursor.fetchone()
    conn.close()
    if row:
        row_dict = dict(row)
        stored_hash = row_dict.pop("password_hash")
        if verify_password(password, stored_hash):
            return row_dict
    return None

def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
    """
    Retrieve user record details by user primary key ID.

    Args:
        user_id (int): The unique user ID.

    Returns:
        Optional[Dict[str, Any]]: User profile info if found, else None.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, email, name FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return dict(row)
    return None

def add_history_entry(user_id: int, date: str, total_emissions: float, eco_score: int, raw_input: Dict[str, Any]) -> int:
    """
    Save a carbon footprint calculation assessment entry to the database.

    Args:
        user_id (int): ID of the user saving the log.
        date (str): ISO date string.
        total_emissions (float): Calculated CO2e emissions in kg.
        eco_score (int): Calculated ecological rating.
        raw_input (Dict[str, Any]): Full parameters dict from the questionnaire.

    Returns:
        int: The inserted history row entry ID.
    """
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
    """
    Retrieve all historical assessment logs associated with a user.

    Args:
        user_id (int): ID of the user.

    Returns:
        List[Dict[str, Any]]: Log entries with deserialized questionnaire inputs.
    """
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

def clear_user_history(user_id: int) -> None:
    """
    Delete all footprint assessment log entries associated with a user.

    Args:
        user_id (int): ID of the user.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM history WHERE user_id = ?", (user_id,))
    conn.commit()
    conn.close()

def add_activity(user_id: int, date: str, action_id: str, points: int, co2_saved: float) -> int:
    """
    Record a completed daily carbon reduction action.

    Args:
        user_id (int): ID of the user.
        date (str): ISO date string.
        action_id (str): Reference string of the logger action.
        points (int): Eco experience points earned.
        co2_saved (float): Mass in kg CO2e saved by this specific action.

    Returns:
        int: The inserted activity logger row ID.
    """
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
    """
    Retrieve chronological daily activity logs logged by a user.

    Args:
        user_id (int): ID of the user.

    Returns:
        List[Dict[str, Any]]: List of recorded activities.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, date, action_id, points, co2_saved FROM activities WHERE user_id = ? ORDER BY id DESC",
        (user_id,)
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def delete_activity(user_id: int, activity_id: int) -> None:
    """
    Remove a specific daily action log from a user's logs.

    Args:
        user_id (int): ID of the user.
        activity_id (int): Primary key ID of the activity entry.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM activities WHERE user_id = ? AND id = ?", (user_id, activity_id))
    conn.commit()
    conn.close()

def clear_activities(user_id: int) -> None:
    """
    Clear all logged activities of a user.

    Args:
        user_id (int): ID of the user.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM activities WHERE user_id = ?", (user_id,))
    conn.commit()
    conn.close()

def get_user_challenges(user_id: int) -> List[Dict[str, Any]]:
    """
    Fetch the list of weekly eco-challenges for a user.

    If challenges do not exist, seeds the user table with default challenge entries.

    Args:
        user_id (int): ID of the user.

    Returns:
        List[Dict[str, Any]]: List of challenges and progress details.
    """
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
    """
    Modify the progress status of a weekly challenge for a user.

    Handles default timestamp assignment for activations and completions.

    Args:
        user_id (int): ID of the user.
        challenge_id (str): Unique identifier of the challenge (e.g. 'pedal_power').
        status (str): New status ('available', 'active', 'completed').
        completed_date (Optional[str]): Explicit completion date string.

    Returns:
        bool: True if database row was successfully updated, False otherwise.
    """
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

def clear_user_challenges(user_id: int) -> None:
    """
    Remove all weekly challenge entries associated with a user.

    Args:
        user_id (int): ID of the user.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM user_challenges WHERE user_id = ?", (user_id,))
    conn.commit()
    conn.close()
