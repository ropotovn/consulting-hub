import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../hooks/useStore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
        createdAt: now, updatedAt: now,
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
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
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
