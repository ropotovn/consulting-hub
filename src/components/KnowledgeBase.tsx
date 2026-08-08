import React from 'react';
import { useStore } from '../hooks/useStore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const KnowledgeBase: React.FC = () => {
  const { notes, selectedNoteId, setSelectedNoteId, setEditingNoteId, deleteNote } = useStore();

  // Find notes that link TO the currently selected note
  const backlinks = selectedNoteId
    ? notes.filter(n => n.links.includes(selectedNoteId))
    : [];

  const selectedNote = selectedNoteId ? notes.find(n => n.id === selectedNoteId) : null;

  return (
    <div className="kb-layout">
      {/* File tree */}
      <div className="kb-files">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span className="kb-files-title">Notes</span>
          <button
            className="btn-ghost"
            style={{ padding: '2px 8px', fontSize: 11 }}
            onClick={() => setEditingNoteId('new')}
          >
            +
          </button>
        </div>
        {notes.map(note => (
          <div
            key={note.id}
            className={`kb-file-item ${selectedNoteId === note.id ? 'active' : ''}`}
            onClick={() => setSelectedNoteId(note.id)}
          >
            <span className="kb-file-icon">#</span>
            {note.title}
          </div>
        ))}
        {notes.length === 0 && (
          <div style={{ color: 'var(--text-muted)', fontSize: 11, padding: '8px 0', fontFamily: 'var(--font-mono)' }}>
            No notes yet
          </div>
        )}
      </div>

      {/* Note content */}
      <div className="kb-note-panel">
        {selectedNote ? (
          <div className="kb-note-layout">
            <div className="kb-note-main">
            <div className="kb-note-header">
              <button className="btn-back" onClick={() => setSelectedNoteId(null)}>
                &larr; All notes
              </button>
              <div className="kb-note-actions">
                <button className="btn-ghost" onClick={() => setEditingNoteId(selectedNote.id)}>
                  Edit
                </button>
                <button className="btn-ghost" onClick={() => {
                  if (window.confirm('Delete this note?')) { deleteNote(selectedNote.id); setSelectedNoteId(null); }
                }}>
                  Del
                </button>
              </div>
            </div>

            <h2 style={{ fontSize: 18, fontWeight: 600, fontFamily: 'var(--font-mono)', marginBottom: 4 }}>
              {selectedNote.title}
            </h2>

            <div className="kb-note-meta">
              <span>Updated {new Date(selectedNote.updatedAt).toLocaleDateString('ru-RU')}</span>
              {selectedNote.tags.length > 0 && (
                <div className="kb-tags">
                  {selectedNote.tags.map(tag => <span key={tag} className="kb-tag">{tag}</span>)}
                </div>
              )}
            </div>

            <div className="kb-note-content markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedNote.content}</ReactMarkdown>
            </div>
            </div>

            {/* References sidebar */}
            <div className="kb-refs">
              {selectedNote.links.length > 0 && (
                <div className="kb-refs-section">
                  <div className="kb-refs-title">Links</div>
                  {selectedNote.links.map(linkId => {
                    const linked = notes.find(n => n.id === linkId);
                    return linked ? (
                      <button key={linkId} className="kb-refs-item" onClick={() => setSelectedNoteId(linkId)}>
                        {linked.title}
                      </button>
                    ) : null;
                  })}
                </div>
              )}
              {backlinks.length > 0 && (
                <div className="kb-refs-section">
                  <div className="kb-refs-title">Linked from</div>
                  {backlinks.map(n => (
                    <button key={n.id} className="kb-refs-item" onClick={() => setSelectedNoteId(n.id)}>
                      {n.title}
                    </button>
                  ))}
                </div>
              )}
              {selectedNote.links.length === 0 && backlinks.length === 0 && (
                <div className="kb-refs-empty">No references yet.<br />Use [[links]] to connect notes.</div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>
            Select a note
          </div>
        )}
      </div>
    </div>
  );
};

export default KnowledgeBase;
