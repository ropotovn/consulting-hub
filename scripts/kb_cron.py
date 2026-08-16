#!/usr/bin/env python3
"""stabs KB cron helper — read/write per-workspace data in Supabase.

Subcommands:
  dump                      Print JSON: active workspaces with their tasks
                            (incl. current-state "stuck" signals) and notes
                            (id/title/type/tags — for dedup).
  add <ws_id> <file.json>   Upsert a note (full Note object in a JSON file)
                            into a workspace.
  seed <ws_id>              Seed the onboarding note (supabase/seed_onboarding.md)
                            into a workspace ONLY if it has zero notes yet.

Auth: reads VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
      Uses the service-role key so it can see ALL workspaces (bypasses RLS).
"""
import json
import os
import sys
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_URL = "https://ooxhfrrlxrhizkcgyjao.supabase.co"

STUCK_KEYWORDS = [
    "не знаю", "не знаем", "застрял", "застряли", "тупик", "страшно",
    "боюсь", "боимся", "сложно", "не получается", "откладыва", "непонятно",
    "не понятно", "завис", "трудно", "лень", "не хочу", "не идёт", "не идет",
    "хз", "не могу", "не можем", "паника", "тревож", "страх", "сомнева",
    "не уверен", "с чего начать", "прокрастин", "не горит", "не хватает времени",
]


def load_env():
    p = os.path.join(REPO, ".env.local")
    if os.path.exists(p):
        for line in open(p, encoding="utf-8"):
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            if k and k not in os.environ:
                os.environ[k] = v


def url():
    return os.environ.get("VITE_SUPABASE_URL", DEFAULT_URL).rstrip("/")


def key():
    return os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")


def request(method, path, body=None, headers=None):
    u = url() + path
    h = {
        "apikey": key(),
        "Authorization": "Bearer " + key(),
        "Content-Type": "application/json",
    }
    if headers:
        h.update(headers)
    data = None
    if body is not None:
        data = json.dumps(body, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(u, data=data, method=method, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            raw = r.read()
            return r.status, (json.loads(raw) if raw else {})
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            parsed = json.loads(raw) if raw else {}
        except Exception:
            parsed = raw.decode("utf-8", "replace") if raw else {}
        return e.code, parsed
    except urllib.error.URLError as e:
        return 0, {"error": str(e)}


def get_workspaces():
    status, data = request(
        "GET",
        "/rest/v1/workspaces?select=id,name,slug,created_at&deleted_at=is.null&order=created_at.asc",
    )
    if status != 200:
        print(json.dumps({"error": "workspaces query failed", "status": status, "detail": data},
                         ensure_ascii=False), file=sys.stderr)
        return []
    return data if isinstance(data, list) else []


def get_rows(table, ws_id):
    status, data = request(
        "GET", f"/rest/v1/{table}?select=data&workspace_id=eq.{ws_id}"
    )
    if status != 200:
        return []
    return [r.get("data") for r in data if isinstance(r, dict) and "data" in r]


def parse_dt(s):
    if not s:
        return None
    try:
        s = s.strip()
        if s.endswith("Z"):
            s = s[:-1] + "+00:00"
        dt = datetime.fromisoformat(s)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return None


def analyze_task(t):
    now = datetime.now(timezone.utc)
    created = parse_dt(t.get("createdAt"))
    days_open = round((now - created).total_seconds() / 86400, 1) if created else None

    status = t.get("status")
    priority = t.get("priority")
    priority_now_open = priority == "now" and status != "done"

    comments = t.get("comments") or []
    comment_texts = " ".join((c.get("text") or "") for c in comments).lower()
    kw_hits = sorted({kw for kw in STUCK_KEYWORDS if kw.lower() in comment_texts})

    score = 0.0
    if priority_now_open:
        score += 0.3
    if kw_hits:
        score += 0.3
    if days_open is not None and days_open >= 7:
        score += 0.2
    elif days_open is not None and days_open >= 3:
        score += 0.1
    score = min(1.0, round(score, 2))

    signals = []
    if priority_now_open:
        signals.append("priority 'now' still open")
    if kw_hits:
        signals.append("stuck comment: " + ", ".join(kw_hits))
    if days_open is not None and days_open >= 7:
        signals.append(f"open {days_open}d")

    return {
        "id": t.get("id"),
        "title": t.get("title"),
        "status": status,
        "priority": priority,
        "days_open": days_open,
        "stuck_keywords": kw_hits,
        "stuck_score": score,
        "signals": signals,
    }


def cmd_dump():
    ws = get_workspaces()
    out = {"generated_at": datetime.now(timezone.utc).isoformat(), "workspaces": []}
    for w in ws:
        ws_id = w["id"]
        tasks = get_rows("tasks", ws_id)
        notes = get_rows("notes", ws_id)
        analyzed = [analyze_task(t) for t in tasks]
        analyzed.sort(key=lambda x: x["stuck_score"], reverse=True)
        out["workspaces"].append({
            "workspace_id": ws_id,
            "name": w.get("name"),
            "slug": w.get("slug"),
            "task_count": len(tasks),
            "tasks": analyzed,
            "notes": [
                {
                    "id": n.get("id"),
                    "title": n.get("title"),
                    "type": n.get("type"),
                    "tags": n.get("tags", []),
                    "pinned": bool(n.get("pinned")),
                }
                for n in notes
                if isinstance(n, dict)
            ],
        })
    print(json.dumps(out, ensure_ascii=False, indent=2))


def cmd_add(ws_id, file_path):
    with open(file_path, encoding="utf-8") as f:
        note = json.load(f)
    note_id = note.get("id") or ("n" + str(int(time.time() * 1000)))
    note.setdefault("comments", [])
    body = {"workspace_id": ws_id, "id": note_id, "data": note}
    status, resp = request(
        "POST",
        "/rest/v1/notes?on_conflict=workspace_id,id",
        body=body,
        headers={"Prefer": "resolution=merge-duplicates"},
    )
    if status in (200, 201):
        print(f"ok: note {note_id!r} upserted into {ws_id}")
    else:
        print(f"error {status}: {json.dumps(resp, ensure_ascii=False)}", file=sys.stderr)
        sys.exit(1)


def cmd_seed(ws_id):
    existing = get_rows("notes", ws_id)
    if existing:
        print(f"skip: workspace {ws_id} already has {len(existing)} note(s)")
        return
    md_path = os.path.join(REPO, "supabase", "seed_onboarding.md")
    if not os.path.exists(md_path):
        print(f"error: {md_path} not found", file=sys.stderr)
        sys.exit(1)
    content = open(md_path, encoding="utf-8").read()
    # first line "# Title" -> title; strip it from content
    lines = content.split("\n")
    title = lines[0].lstrip("# ").strip() if lines and lines[0].startswith("#") else "Getting started"
    body = "\n".join(lines[1:]).strip()
    now = datetime.now(timezone.utc).isoformat()
    note = {
        "id": "onboarding",
        "title": title,
        "content": body,
        "tags": ["старт", "онбординг", "гайд"],
        "links": [],
        "createdAt": now,
        "updatedAt": now,
        "comments": [],
        "pinned": True,
        "type": "guide",
    }
    status, resp = request(
        "POST",
        "/rest/v1/notes?on_conflict=workspace_id,id",
        body={"workspace_id": ws_id, "id": note["id"], "data": note},
        headers={"Prefer": "resolution=merge-duplicates"},
    )
    if status in (200, 201):
        print(f"ok: onboarding note seeded into {ws_id}")
    else:
        print(f"error {status}: {json.dumps(resp, ensure_ascii=False)}", file=sys.stderr)
        sys.exit(1)


def main():
    load_env()
    if not key():
        print("error: SUPABASE_SERVICE_ROLE_KEY not set", file=sys.stderr)
        sys.exit(1)
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        sys.exit(1)
    cmd = args[0]
    if cmd == "dump":
        cmd_dump()
    elif cmd == "add" and len(args) == 3:
        cmd_add(args[1], args[2])
    elif cmd == "seed" and len(args) == 2:
        cmd_seed(args[1])
    else:
        print(__doc__)
        sys.exit(1)


if __name__ == "__main__":
    main()
