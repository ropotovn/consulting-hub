#!/usr/bin/env python3
"""Analyze the shtab kanban for 'stuck' behavioral signals.

Reads public/data/tasks.json (current state) plus the git history of that
file, then emits a JSON report per task:
  - days_open: how long the task has existed
  - deadline_shifts: how many distinct deadline values it went through
  - status_changes / status_reversals: todo<->doing<->done flips (backwards = stuck)
  - priority_changes: priority downshifts
  - stuck_keywords: comment text hits for fear/avoidance markers
  - stuck_score: 0..1 heuristic

The cron job `shtab-kb-auto-article` consumes this to decide whether to emit
a `boost` / `case` article aimed at a specific stalled stage instead of a
rotated generic one. No network, no tokens — reads local git only.

Usage: python3 scripts/analyze_tasks.py
"""
import json
import os
import subprocess
from datetime import datetime, timezone

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TASKS_PATH = "public/data/tasks.json"
MAX_HISTORY = 80  # cap git snapshots for speed; enough to catch recent stalls

STUCK_KEYWORDS = [
    "не знаю", "не знаем", "застрял", "застряли", "тупик", "страшно",
    "боюсь", "боимся", "сложно", "не получается", "откладыва", "непонятно",
    "не понятно", "завис", "трудно", "лень", "не хочу", "не идёт", "не идет",
    "хз", "не могу", "не можем", "паника", "тревож", "страх", "сомнева",
    "не уверен", "с чего начать", "прокрастин", "не горит", "не хватает времени",
]


def run(cmd: str) -> str:
    return subprocess.run(cmd, shell=True, capture_output=True, text=True, cwd=REPO).stdout


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


def load_tasks_at(sha: str):
    out = run(f"git show {sha}:{TASKS_PATH}")
    try:
        return json.loads(out)
    except Exception:
        return None


def transitions(seq):
    """Count total changes and backwards moves (a sign of going in circles)."""
    changes = 0
    reversals = 0
    backwards = {("doing", "todo"), ("done", "todo"), ("done", "doing")}
    for a, b in zip(seq, seq[1:]):
        if a != b:
            changes += 1
            if (a, b) in backwards:
                reversals += 1
    return changes, reversals


def distinct_nonnull(seq):
    return len({x for x in seq if x})


def main():
    with open(os.path.join(REPO, TASKS_PATH), encoding="utf-8") as f:
        current = json.load(f)

    shas = run(f"git log --format=%H -- {TASKS_PATH}").strip().splitlines()
    shas = shas[:MAX_HISTORY]

    timeline = {}
    for sha in reversed(shas):  # oldest -> newest
        tasks = load_tasks_at(sha)
        if not tasks:
            continue
        for t in tasks:
            tid = t.get("id")
            if not tid:
                continue
            e = timeline.setdefault(tid, {"status": [], "priority": [], "deadline": []})
            e["status"].append(t.get("status"))
            e["priority"].append(t.get("priority"))
            e["deadline"].append(t.get("deadline"))

    now = datetime.now(timezone.utc)
    report = []
    for t in current:
        tid = t.get("id")
        hist = timeline.get(tid, {"status": [], "priority": [], "deadline": []})
        status_changes, status_reversals = transitions(hist["status"])
        priority_changes, _ = transitions(hist["priority"])
        deadline_shifts = max(0, distinct_nonnull(hist["deadline"]) - 1)

        created = parse_dt(t.get("createdAt"))
        days_open = round((now - created).total_seconds() / 86400, 1) if created else None

        status = t.get("status")
        priority = t.get("priority")
        mismatch = priority == "now" and status in ("todo", "doing")

        comments = t.get("comments") or []
        comment_texts = " ".join((c.get("text") or "") for c in comments).lower()
        kw_hits = sorted({kw for kw in STUCK_KEYWORDS if kw.lower() in comment_texts})

        score = 0.0
        if deadline_shifts >= 2:
            score += 0.25
        elif deadline_shifts == 1:
            score += 0.1
        if status_reversals >= 1:
            score += 0.25
        if status_changes >= 3:
            score += 0.1
        if mismatch:
            score += 0.1
        if kw_hits:
            score += 0.25
        if days_open is not None and days_open >= 7:
            score += 0.1
        score = min(1.0, round(score, 2))

        signals = []
        if deadline_shifts:
            signals.append(f"deadline shifted {deadline_shifts}x")
        if status_reversals:
            signals.append(f"status reverted {status_reversals}x")
        if mismatch:
            signals.append("priority 'now' still open")
        if kw_hits:
            signals.append("stuck comment: " + ", ".join(kw_hits))
        if days_open is not None and days_open >= 7:
            signals.append(f"open {days_open}d")

        report.append({
            "id": tid,
            "title": t.get("title"),
            "status": status,
            "priority": priority,
            "days_open": days_open,
            "deadline_shifts": deadline_shifts,
            "status_changes": status_changes,
            "status_reversals": status_reversals,
            "priority_changes": priority_changes,
            "comment_count": len(comments),
            "stuck_keywords": kw_hits,
            "stuck_score": score,
            "signals": signals,
        })

    report.sort(key=lambda x: x["stuck_score"], reverse=True)
    stuck = [r for r in report if r["stuck_score"] >= 0.4 and r["status"] != "done"]

    print(json.dumps({"generated_at": now.isoformat(), "tasks": report, "stuck_tasks": stuck},
                     ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
