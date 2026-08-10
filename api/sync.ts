// Vercel Edge — single source of truth for shtab data
export default async function handler(req) {
  const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  
  // @ts-ignore - process.env available in Vercel Edge runtime
  const t = (process.env.GH_TOKEN || '').trim();
  if (!t) return new Response('No GH_TOKEN', { status: 500, headers: CORS });
  const token_auth = 'token ' + t;
  const gh = { 'Authorization': token_auth, 'Accept': 'application/vnd.github.v3+json' };
  const repo = 'ropotovn/consulting-hub';
  const branch = 'main';
  const base = 'https://api.github.com/repos/' + repo + '/contents/public/data/';
  const enc = function(s) { return btoa(unescape(encodeURIComponent(s))); };
  
  if (req.method === 'GET') {
    try {
      const url = new URL(req.url);
      const file = url.searchParams.get('file') || 'notes.json';
      const getUrl = base + file + '?ref=' + branch;
      const res = await fetch(getUrl, { headers: gh, cache: 'no-store' });
      if (!res.ok) return new Response(JSON.stringify({ ok: false, error: 'GitHub read: ' + res.status }), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } });
      const d = await res.json();
      const content = JSON.parse(atob(d.content.replace(/\s/g, '')));
      return new Response(JSON.stringify({ ok: true, data: content, sha: d.sha }), {
        status: 200,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }
  }
  
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      const { path, content } = body;
      const fileName = (path || 'public/data/notes.json').split('/').pop();
      const getUrl = base + fileName + '?ref=' + branch;
      const getRes = await fetch(getUrl, { headers: gh });
      const d = await getRes.json();
      const sha = d.sha;
      const json = JSON.stringify(content, null, 2);
      const putBody = JSON.stringify({ message: 'sync: auto-update', content: enc(json), sha, branch });
      const putRes = await fetch(base + fileName, {
        method: 'PUT',
        headers: { ...gh, 'Content-Type': 'application/json' },
        body: putBody,
      });
      if (!putRes.ok) {
        const err = await putRes.json().catch(() => ({}));
        return new Response(JSON.stringify({ ok: false, error: err.message || 'write failed' }), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } });
      }
      const putData = await putRes.json();
      return new Response(JSON.stringify({ ok: true, sha: putData.content.sha }), { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } });
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }
  }
  
  return new Response('OK', { status: 200, headers: CORS });
}
export const config = { runtime: 'edge' };
