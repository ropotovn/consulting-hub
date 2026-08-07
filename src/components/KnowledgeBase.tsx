import React from 'react';
import { useStore } from '../hooks/useStore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const KnowledgeBase: React.FC = () => {
  const { notes, selectedNoteId, setSelectedNoteId, setEditingNoteId, deleteNote } = useStore();

  if (selectedNoteId) {
    const note = notes.find(n => n.id === selectedNoteId);
    if (!note) return null;

    return (
      <div className="kb-note-view">
        <div className="kb-note-header">
          <button className="btn-back" onClick={() => setSelectedNoteId(null)}>
            ← Назад
          </button>
          <div className="kb-note-actions">
            <button className="btn-ghost" onClick={() => setEditingNoteId(note.id)}>
              ✏️
            </button>
            <button className="btn-ghost" onClick={() => {
              if (window.confirm('Удалить заметку?')) {
                deleteNote(note.id);
                setSelectedNoteId(null);
              }
            }}>
              🗑️
            </button>
          </div>
        </div>
        <div className="kb-note-meta">
          <span>Обновлено: {new Date(note.updatedAt).toLocaleDateString('ru-RU')}</span>
          {note.tags.length > 0 && (
            <div className="kb-tags">
              {note.tags.map(tag => (
                <span key={tag} className="kb-tag">{tag}</span>
              ))}
            </div>
          )}
        </div>
        <div className="kb-note-content markdown-body">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {note.content}
          </ReactMarkdown>
        </div>
        {note.links.length > 0 && (
          <div className="kb-note-links">
            <h4>Связанные заметки</h4>
            {note.links.map(linkId => {
              const linked = notes.find(n => n.id === linkId);
              return linked ? (
                <button
                  key={linkId}
                  className="kb-link-btn"
                  onClick={() => setSelectedNoteId(linkId)}
                >
                  📄 {linked.title}
                </button>
              ) : null;
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="kb-list">
      <div className="kb-header">
        <h2>📚 База знаний</h2>
        <button className="btn-primary" onClick={() => setEditingNoteId('new')}>
          + Новая заметка
        </button>
      </div>
      <div className="kb-grid">
        {notes.map(note => (
          <div
            key={note.id}
            className="kb-card"
            onClick={() => setSelectedNoteId(note.id)}
          >
            <h3 className="kb-card-title">{note.title}</h3>
            <p className="kb-card-preview">
              {note.content.replace(/[#*`\n\[\]]/g, '').slice(0, 120)}...
            </p>
            <div className="kb-card-footer">
              <div className="kb-card-tags">
                {note.tags.slice(0, 3).map(tag => (
                  <span key={tag} className="kb-tag">{tag}</span>
                ))}
              </div>
              <span className="kb-card-date">
                {new Date(note.updatedAt).toLocaleDateString('ru-RU')}
              </span>
            </div>
          </div>
        ))}
      </div>
      {notes.length === 0 && (
        <div className="kb-empty">
          <p>Пока нет заметок. Создайте первую!</p>
        </div>
      )}
    </div>
  );
};

export default KnowledgeBase;
