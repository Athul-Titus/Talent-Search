import sqlite3
import json
import sys
import os

sys.path.insert(0, r"c:\Users\athul\OneDrive\Desktop\Cymonic project\backend")
from services.fraud_detector import algorithmic_credibility

db_paths = [
    r"c:\Users\athul\OneDrive\Desktop\Cymonic project\backend\talent_engine.db",
    r"c:\Users\athul\OneDrive\Desktop\Cymonic project\talent_engine.db"
]

for db_path in db_paths:
    if not os.path.exists(db_path):
        continue
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute("SELECT id, name, parsed_profile, raw_text FROM candidates")
    rows = c.fetchall()
    print(f"\n=== Updating {db_path} ({len(rows)} candidates) ===")
    for cid, name, prof_json, raw in rows:
        if not prof_json:
            continue
        try:
            prof = json.loads(prof_json)
            result = algorithmic_credibility(prof, raw)
            c.execute("""
                UPDATE candidates
                SET credibility_score = ?, flag_level = ?, stuffed_keywords = ?, flag_reason = ?
                WHERE id = ?
            """, (
                result["credibility_score"],
                result["flag_level"],
                json.dumps(result["stuffed_keywords"]),
                result["reason"],
                cid
            ))
            print(f"Candidate [{cid}] {name}: {result['flag_level']} (Score: {result['credibility_score']}) Stuffed: {result['stuffed_keywords']}")
        except Exception as e:
            print(f"Error updating {name}: {e}")
    conn.commit()
    conn.close()
print("\nRecalibration complete!")
