#!/usr/bin/env python3
"""Migrate legacy 'nikita'/'sanya' attribution to UserRef objects in Supabase.

Idempotent: already-migrated rows (dict UserRef) are left untouched.
Also backfills Nikita's profile username.
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kb_cron  # noqa: E402

NIKITA_UUID = '8d2e0b53-9e84-4be4-8f99-14287fb62bd1'
NIKITA = {'id': NIKITA_UUID, 'name': 'Никита', 'username': 'nikita'}
SANYA = {'id': 'sanya', 'name': 'Саня', 'username': 'sanya'}


def as_ref(v):
    if isinstance(v, dict) and 'id' in v:
        return v  # already migrated
    if v in ('nikita', 'Никита', 'Никита Ропотов'):
        return NIKITA
    if v in ('sanya', 'Саня'):
        return SANYA
    if v is None:
        return None
    return {'id': 'unknown', 'name': str(v), 'username': ''}


def migrate_task(t):
    changed = False
    if not isinstance(t.get('assignee'), dict):
        t['assignee'] = as_ref(t.get('assignee'))
        changed = True
    if t.get('createdBy') == 'user':
        t['createdBy'] = NIKITA
        changed = True
    elif not isinstance(t.get('createdBy'), dict) and t.get('createdBy') != 'agent':
        t['createdBy'] = 'agent'
        changed = True
    for c in (t.get('comments') or []):
        if not isinstance(c.get('author'), dict):
            c['author'] = as_ref(c.get('author'))
            changed = True
        c.pop('authorName', None)
    return t, changed


def migrate_note(n):
    changed = False
    for c in (n.get('comments') or []):
        if not isinstance(c.get('author'), dict):
            c['author'] = as_ref(c.get('author'))
            changed = True
    return n, changed


def main():
    kb_cron.load_env()
    if not kb_cron.key():
        print('error: no service role key', file=sys.stderr)
        sys.exit(1)

    # backfill Nikita's profile username
    kb_cron.request('PATCH', '/rest/v1/profiles?id=eq.' + NIKITA_UUID,
                    body={'username': 'nikita'},
                    headers={'Prefer': 'return=minimal'})

    ws = kb_cron.get_workspaces()
    for w in ws:
        ws_id = w['id']
        tasks = kb_cron.get_rows('tasks', ws_id)
        notes = kb_cron.get_rows('notes', ws_id)
        t_changed = n_changed = 0
        for t in tasks:
            mt, ch = migrate_task(t)
            if ch:
                kb_cron.request('POST', '/rest/v1/tasks?on_conflict=workspace_id,id',
                                body={'workspace_id': ws_id, 'id': t['id'], 'data': mt},
                                headers={'Prefer': 'resolution=merge-duplicates'})
                t_changed += 1
        for n in notes:
            mn, ch = migrate_note(n)
            if ch:
                kb_cron.request('POST', '/rest/v1/notes?on_conflict=workspace_id,id',
                                body={'workspace_id': ws_id, 'id': n['id'], 'data': mn},
                                headers={'Prefer': 'resolution=merge-duplicates'})
                n_changed += 1
        print(f"{w['name']}: {t_changed} tasks / {n_changed} notes migrated")


if __name__ == '__main__':
    main()
