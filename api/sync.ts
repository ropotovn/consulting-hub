// Vercel Edge — single source of truth for shtab data.
//
// POST now MERGES incoming data with the current remote state instead of
// blindly overwriting it. Merge rules: union by `id`; incoming wins on scalar
// fields; `comments` arrays union by comment id; remote-only items are kept.
// This prevents a stale client from wiping articles added by the cron (or by
// another client). Deletions use a shared tombstone list in
// public/data/deleted.json so a delete still propagates.
export default async function handler(req) {
  const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  const t = (process.env.GH_TOKEN || '').trim();
  if (!t) return new Response('No GH_TOKEN', { status: 500, headers: CORS });
  const token_auth = 'token ' + t;
  const gh = { 'Authorization': token_auth, 'Accept': 'application/vnd.github.v3+json' };
  const repo = 'ropotovn/consulting-hub';
  const branch = 'main';
  const base = 'https://api.github.com/repos/' + repo + '/contents/public/data/';
  const enc = function(s) { return btoa(unescape(encodeURIComponent(s))); };
  const dec = function(s) {
    const raw = atob(s.replace(/\s/g, ''));
    const bytes = Uint8Array.from(raw, c => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  };

  // Merge two arrays of {id, ...} objects.
  function mergeById(current, incoming, deleted) {
    const out = [];
    const seen = new Set();
    const curMap = new Map((current || []).map(x => [x.id, x]));
    for (const inc of (incoming || [])) {
      if (!inc || !inc.id) continue;
      if (deleted.includes(inc.id)) continue;
      const cur = curMap.get(inc.id);
      let item = inc;
      if (cur) {
        item = { ...cur, ...inc };
        const bc = cur.comments || [];
        const oc = inc.comments || [];
        if (bc.length || oc.length) {
          const cids = new Set(bc.map(c => c.id));
          item.comments = [...bc, ...oc.filter(c => !cids.has(c.id))];
        }
      }
      out.push(item);
      seen.add(inc.id);
    }
    for (const cur of (current || [])) {
      if (!cur || !cur.id) continue;
      if (seen.has(cur.id)) continue;
      if (deleted.includes(cur.id)) continue;
      out.push(cur);
    }
    return out;
  }

  if (req.method === 'GET') {
    try {
      const url = new URL(req.url);
      const file = url.searchParams.get('file') || 'notes.json';
      const getUrl = base + file + '?ref=' + branch;
      const res = await fetch(getUrl, { headers: gh, cache: 'no-store' });
      if (!res.ok) return new Response(JSON.stringify({ ok: false, error: 'GitHub read: ' + res.status }), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } });
      const d = await res.json();
      const content = JSON.parse(dec(d.content));
      return new Response(JSON.stringify({ ok: true, data: content, sha: d.sha }), { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } });
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = await req.json();
      const { path, content, deleted } = body;
      const fileName = (path || 'public/data/notes.json').split('/').pop();

      // 1) current state of the target file
      const getUrl = base + fileName + '?ref=' + branch;
      const getRes = await fetch(getUrl, { headers: gh });
      if (!getRes.ok) return new Response(JSON.stringify({ ok: false, error: 'GitHub read: ' + getRes.status }), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } });
      const d = await getRes.json();
      const sha = d.sha;
      const current = JSON.parse(dec(d.content));

      // 2) shared tombstone list (may not exist yet)
      let serverDeleted = [];
      let delSha = null;
      try {
        const delRes = await fetch(base + 'deleted.json?ref=' + branch, { headers: gh });
        if (delRes.ok) {
          const dd = await delRes.json();
          serverDeleted = JSON.parse(dec(dd.content));
          delSha = dd.sha;
        }
      } catch {}

      const incomingDeleted = Array.isArray(deleted) ? deleted : [];
      const mergedDeleted = [...new Set([...serverDeleted, ...incomingDeleted])];

      const incoming = Array.isArray(content) ? content : current;
      const merged = mergeById(current, incoming, mergedDeleted);

      // 3) write merged data back
      const json = JSON.stringify(merged, null, 2);
      const putBody = JSON.stringify({ message: 'sync: auto-update', content: enc(json), sha, branch });
      const putRes = await fetch(base + fileName, { method: 'PUT', headers: { ...gh, 'Content-Type': 'application/json' }, body: putBody });
      if (!putRes.ok) {
        const err = await putRes.json().catch(() => ({}));
        return new Response(JSON.stringify({ ok: false, error: err.message || 'write failed' }), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } });
      }
      const putData = await putRes.json();

      // 4) write tombstones if they changed
      const delChanged = mergedDeleted.length !== serverDeleted.length ||
        (mergedDeleted.length > 0 && JSON.stringify(mergedDeleted) !== JSON.stringify(serverDeleted));
      if (delChanged) {
        const delJson = JSON.stringify(mergedDeleted, null, 2);
        const delPutBody = delSha
          ? JSON.stringify({ message: 'sync: auto-update (deleted)', content: enc(delJson), sha: delSha, branch })
          : JSON.stringify({ message: 'sync: auto-update (deleted)', content: enc(delJson), branch });
        await fetch(base + 'deleted.json', { method: 'PUT', headers: { ...gh, 'Content-Type': 'application/json' }, body: delPutBody });
      }

      return new Response(JSON.stringify({ ok: true, sha: putData.content.sha }), { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } });
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }
  }

  return new Response('OK', { status: 200, headers: CORS });
}
export const config = { runtime: 'edge' };
