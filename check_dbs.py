import sqlite3
import os

for db_path in ['backend/talent_engine.db', 'talent_engine.db']:
    if not os.path.exists(db_path):
        print(f"{db_path}: does not exist")
        continue
    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [t[0] for t in cur.fetchall()]
        print(f"{db_path} (size {os.path.getsize(db_path)} bytes) tables: {tables}")
        for t in tables:
            try:
                cur.execute(f"SELECT count(*) FROM [{t}]")
                print(f"   {t}: {cur.fetchone()[0]} rows")
            except Exception as ex:
                print(f"   {t}: err {ex}")
    except Exception as e:
        print(db_path, "error:", e)
