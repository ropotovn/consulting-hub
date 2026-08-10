const API = 'https://consulting-hub-sage.vercel.app/api/sync';

async function apiGet(file: string) {
  const res = await fetch(API + '?file=' + file + '&_=' + Date.now(), { cache: 'no-store' });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'api error');
  return data.data;
}

export const loadRemoteNotes = () => apiGet('notes.json');
export const loadRemoteTasks = () => apiGet('tasks.json');

export async function syncToRemote(path: string, content: any) {
  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: 'public/data/' + path, content }),
    });
    const data = await res.json();
    return data.ok;
  } catch { return false; }
}
