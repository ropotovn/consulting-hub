import type { ReactNode } from 'react';

const MENTION_RE = /(^|\s)@([a-zA-Z0-9_.-]{3,30})/g;

// Extract all @usernames from a comment (for notification routing).
export function parseMentions(text: string): string[] {
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  MENTION_RE.lastIndex = 0;
  while ((m = MENTION_RE.exec(text)) !== null) {
    seen.add(m[2]);
  }
  return [...seen];
}

// Render text with @handles highlighted as mention chips.
export function renderMentioned(text: string): ReactNode[] {
  const parts = text.split(/(@[a-zA-Z0-9_.-]{3,30})/g);
  return parts.map((p, i) =>
    /^@[a-zA-Z0-9_.-]{3,30}$/.test(p)
      ? <span key={i} className="mention">{p}</span>
      : p,
  );
}
