import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../hooks/useStore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { VIDEO_EXT, youtubeId } from '../media';

function newId(): string {
  return 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

const NoteEdit: React.FC = () => {
  const { notes, editingNoteId, setEditingNoteId, addNote, updateNote } = useStore();
  const existingNote = editingNoteId !== 'new' ? notes.find(n => n.id === editingNoteId) : null;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    if (existingNote) {
      setTitle(existingNote.title);
      setContent(existingNote.content);
      setTags(existingNote.tags.join(', '));
    } else {
      // Restore draft if exists
      const draft = localStorage.getItem('shtab_note_draft');
      if (draft) {
        try {
          const d = JSON.parse(draft);
          setTitle(d.title || '');
          setContent(d.content || '');
          setTags(d.tags || '');
        } catch {}
      } else {
        setTitle(''); setContent(''); setTags('');
      }
    }
  }, [existingNote]);

  // Autosave draft every 1.5s
  const draftTimer = useRef<number>(0);
  useEffect(() => {
    if (existingNote) return;
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = window.setTimeout(() => {
      localStorage.setItem('shtab_note_draft', JSON.stringify({ title, content, tags }));
    }, 1500);
    return () => { if (draftTimer.current) clearTimeout(draftTimer.current); };
  }, [title, content, tags, existingNote]);

  const handleSave = () => {
    if (!title.trim()) return;

    const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);

    const linkRegex = /\[\[([^\]]+)\]\]/g;
    const linkMatches = [...content.matchAll(linkRegex)];
    const linkTitles = linkMatches.map(m => m[1].trim());
    const links = notes.filter(n => linkTitles.includes(n.title)).map(n => n.id);

    const now = new Date().toISOString();

    if (existingNote) {
      updateNote(existingNote.id, {
        title: title.trim(), content, tags: tagList, links, updatedAt: now,
      });
    } else {
      addNote({
        id: newId(), title: title.trim(), content, tags: tagList, links,
        createdAt: now, updatedAt: now, comments: [],
      });
    }

    localStorage.removeItem('shtab_note_draft');
    setEditingNoteId(null);
  };

  return (
    <div className="modal-overlay" onClick={() => setEditingNoteId(null)}>
      <div className="note-editor" onClick={e => e.stopPropagation()}>
        <div className="editor-header">
          <input
            className="input editor-title"
            placeholder="Note title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            autoFocus
          />
          <div className="editor-actions">
            <div className="format-bar">
              <button type="button" className="fmt-btn" title="Bold" onClick={() => setContent(c => c + '**bold**')}>B</button>
              <button type="button" className="fmt-btn" title="Heading" onClick={() => setContent(c => c + '\n## Heading')}>H</button>
              <button type="button" className="fmt-btn" title="Bullet list" onClick={() => setContent(c => c + '\n- item')}>•</button>
              <button type="button" className="fmt-btn" title="Numbered list" onClick={() => setContent(c => c + '\n1. item')}>1.</button>
              <button type="button" className="fmt-btn" title="Todo" onClick={() => setContent(c => c + '\n- [ ] task')}>☐</button>
              <button type="button" className="fmt-btn" title="Toggle" onClick={() => setContent(c => c + '\n<details>\n<summary>Title</summary>\n\nContent\n</details>')}>▸</button>
              <button type="button" className="fmt-btn" title="Quote" onClick={() => setContent(c => c + '\n> quote')}>❝</button>
              <button type="button" className="fmt-btn" title="Link" onClick={() => setContent(c => c + '[[note title]]')}>🔗</button>
              <button type="button" className="fmt-btn" title="Image" onClick={() => setContent(c => c + '\n![alt text](https://...)')}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
              </button>
              <button type="button" className="fmt-btn" title="Video (mp4/webm/YouTube)" onClick={() => setContent(c => c + '\n[▶ Video](https://...mp4)')}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="14" height="14" rx="2"/><path d="M16 10l6-3v10l-6-3z"/></svg>
              </button>
            </div>
            <button type="button" className={`btn-ghost ${preview ? 'active' : ''}`} onClick={() => setPreview(!preview)}>
              {preview ? 'Edit' : 'Preview'}
            </button>
            <button type="button" className="btn-primary" onClick={handleSave}>Save</button>
            <button type="button" className="btn-close" onClick={() => setEditingNoteId(null)}>x</button>
          </div>
        </div>

        {preview ? (
          <div className="editor-preview markdown-body">
            <h1>{title}</h1>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                a: ({ href, children }) => {
                  if (!href) return <>{children}</>;
                  const yt = youtubeId(href);
                  if (yt) return <div className="kb-embed"><iframe src={`https://www.youtube.com/embed/${yt}`} title="YouTube" allowFullScreen loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" /></div>;
                  if (VIDEO_EXT.test(href)) return <video className="kb-video" src={href} controls preload="metadata" />;
                  return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
                },
                img: ({ src, alt }) => <img className="kb-img" src={src} alt={alt || ''} loading="lazy" />,
              }}
            >{content}</ReactMarkdown>
          </div>
        ) : (
          <textarea
            className="input editor-content"
            placeholder="Markdown. Use [[note title]] for links."
            value={content}
            onChange={e => setContent(e.target.value)}
          />
        )}

        <div className="editor-footer">
          <input
            className="input"
            placeholder="Tags: strategy, product"
            value={tags}
            onChange={e => setTags(e.target.value)}
          />
          <span className="editor-hint">md [[links]]</span>
        </div>
      </div>
    </div>
  );
};

export default NoteEdit;
