import React, { useState, useEffect } from 'react';
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
    }
  }, [existingNote]);

  const handleSave = () => {
    if (!title.trim()) return;

    const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);

    // Extract wiki-links [[note title]] from content
    const linkRegex = /\[\[([^\]]+)\]\]/g;
    const linkMatches = [...content.matchAll(linkRegex)];
    const linkTitles = linkMatches.map(m => m[1].trim());
    const links = notes
      .filter(n => linkTitles.includes(n.title))
      .map(n => n.id);

    const now = new Date().toISOString();

    if (existingNote) {
      updateNote(existingNote.id, {
        title: title.trim(),
        content,
        tags: tagList,
        links,
        updatedAt: now,
      });
    } else {
      addNote({
        id: newId(),
        title: title.trim(),
        content,
        tags: tagList,
        links,
        createdAt: now,
        updatedAt: now,
      });
    }

    setEditingNoteId(null);
  };

  return (
    <div className="modal-overlay" onClick={() => setEditingNoteId(null)}>
      <div className="note-editor" onClick={e => e.stopPropagation()}>
        <div className="editor-header">
          <input
            className="input editor-title"
            placeholder="Название заметки"
            value={title}
            onChange={e => setTitle(e.target.value)}
            autoFocus
          />
          <div className="editor-actions">
            <button
              type="button"
              className={`btn-ghost ${preview ? 'active' : ''}`}
              onClick={() => setPreview(!preview)}
            >
              {preview ? '✏️ Редактировать' : '👁 Превью'}
            </button>
            <button type="button" className="btn-primary" onClick={handleSave}>
              Сохранить
            </button>
            <button type="button" className="btn-close" onClick={() => setEditingNoteId(null)}>
              ✕
            </button>
          </div>
        </div>

        {preview ? (
          <div className="editor-preview markdown-body">
            <h1>{title}</h1>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          </div>
        ) : (
          <textarea
            className="input editor-content"
            placeholder="Пишите в Markdown. Используйте [[название заметки]] для ссылок."
            value={content}
            onChange={e => setContent(e.target.value)}
          />
        )}

        <div className="editor-footer">
          <input
            className="input"
            placeholder="Теги через запятую: продукт, стратегия"
            value={tags}
            onChange={e => setTags(e.target.value)}
          />
          <span className="editor-hint">Markdown • [[ссылки]] на другие заметки</span>
        </div>
      </div>
    </div>
  );
};

export default NoteEdit;
