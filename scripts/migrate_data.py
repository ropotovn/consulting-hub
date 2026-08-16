#!/usr/bin/env python3
"""One-off migration: GitHub JSON (public/data/*.json) -> Supabase per-workspace.

Usage:  python3 scripts/migrate_data.py [email] [workspace_name]
Reads SUPABASE_SERVICE_ROLE_KEY from env or .env.local.
"""
import json
import os
import sys
import urllib.request
import urllib.error

REF = "ooxhfrrlxrhizkcgyjao"
BASE = f"https://{REF}.supabase.co/rest/v1"

def load_key():
    k = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if k:
        return k
    for path in (".env.local", os.path.join(os.path.dirname(__file__), "..", ".env.local")):
        try:
            with open(path) as f:
                for line in f:
                    if line.startswith("SUPABASE_SERVICE_ROLE_KEY="):
                        return line.split("=", 1)[1].strip()
        except FileNotFoundError:
            continue
    return None

def req(method, path, body=None, prefer=None):
    url = BASE + path
    headers = {
        "apikey": KEY,
        "Authorization": f"Bearer {KEY}",
        "Content-Type": "application/json",
    }
    if prefer:
        headers["Prefer"] = prefer
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r) as resp:
            raw = resp.read().decode()
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        body_text = e.read().decode()
        print(f"  HTTP {e.code}: {body_text[:400]}")
        raise

def main():
    global KEY
    KEY = load_key()
    if not KEY:
        print("ERROR: no SUPABASE_SERVICE_ROLE_KEY")
        sys.exit(1)

    email = sys.argv[1] if len(sys.argv) > 1 else "ropotovnr@gmail.com"
    ws_name = sys.argv[2] if len(sys.argv) > 2 else "stabs mafia"

    # 1) find user id
    users = req("GET", f"/profiles?select=id,email&email=eq.{email}") or []
    if not users:
        print(f"ERROR: user not found: {email}")
        sys.exit(1)
    uid = users[0]["id"]
    print(f"user: {uid} ({users[0].get('email')})")

    # 2) find workspace
    workspaces = req("GET", "/workspaces?select=id,name,created_by") or []
    ws = next((w for w in workspaces if w["name"] == ws_name), None)
    if not ws:
        print(f"ERROR: workspace not found: {ws_name}")
        sys.exit(1)
    wid = ws["id"]
    print(f"workspace: {wid} ({ws['name']})")

    # 3) load local data
    base = os.path.join(os.path.dirname(__file__), "..", "public", "data")
    tasks = json.load(open(os.path.join(base, "tasks.json")))
    notes = json.load(open(os.path.join(base, "notes.json")))
    print(f"local data: {len(tasks)} tasks, {len(notes)} notes")

    # 4) insert
    if tasks:
        rows = [{"workspace_id": wid, "id": t["id"], "data": t} for t in tasks]
        req("POST", "/tasks", rows, prefer="return=minimal")
        print(f"inserted tasks: {len(rows)}")
    if notes:
        rows = [{"workspace_id": wid, "id": n["id"], "data": n} for n in notes]
        req("POST", "/notes", rows, prefer="return=minimal")
        print(f"inserted notes: {len(rows)}")

    # 5) verify
    t_count = len(req("GET", f"/tasks?select=id&workspace_id=eq.{wid}") or [])
    n_count = len(req("GET", f"/notes?select=id&workspace_id=eq.{wid}") or [])
    print(f"verify: {t_count} tasks, {n_count} notes in workspace")
    print("DONE")

if __name__ == "__main__":
    main()
