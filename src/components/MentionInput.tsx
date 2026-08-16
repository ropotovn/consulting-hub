import React, { useState } from 'react';
import type { UserRef } from '../types';

interface Props {
  value: string;
  onChange: (v: string) => void;
  members: UserRef[];
  placeholder?: string;
  onEnter?: () => void;
  textarea?: boolean;
  className?: string;
  autoFocus?: boolean;
  style?: React.CSSProperties;
}

// Comment input with @mention autocomplete (like Telegram/Slack).
export default function MentionInput({ value, onChange, members, placeholder, onEnter, textarea, className, autoFocus, style }: Props) {
  const [suggest, setSuggest] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const matches = members
    .filter(m => {
      const q = query.toLowerCase();
      return (m.username || '').toLowerCase().startsWith(q) || (m.name || '').toLowerCase().includes(q);
    })
    .slice(0, 8);

  const handleChange = (v: string) => {
    onChange(v);
    const m = v.match(/(?:^|\s)@([a-zA-Z0-9_.-]*)$/);
    if (m) { setQuery(m[1]); setSuggest(true); setActive(0); }
    else setSuggest(false);
  };

  const pick = (m: UserRef) => {
    const v = value.replace(/(?:^|\s)@([a-zA-Z0-9_.-]*)$/, ` @${m.username || m.name} `);
    onChange(v);
    setSuggest(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (suggest && matches.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => (a + 1) % matches.length); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => (a - 1 + matches.length) % matches.length); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pick(matches[active]); return; }
      if (e.key === 'Escape') { setSuggest(false); return; }
    }
    if (e.key === 'Enter' && onEnter && !suggest) { e.preventDefault(); onEnter(); }
  };

  const shared = {
    className: className || 'input',
    value,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => handleChange(e.target.value),
    onKeyDown,
    placeholder,
    autoFocus,
    style,
  };

  return (
    <div className="mention-input">
      {textarea ? <textarea {...shared} /> : <input {...shared} />}
      {suggest && matches.length > 0 && (
        <div className="mention-suggest">
          {matches.map((m, i) => (
            <button key={m.id} type="button" className={`mention-item ${i === active ? 'active' : ''}`} onMouseDown={e => { e.preventDefault(); pick(m); }}>
              <span className="mention-avatar">{m.name.charAt(0).toUpperCase()}</span>
              <span className="mention-name">{m.name}</span>
              {m.username && <span className="mention-handle">@{m.username}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
