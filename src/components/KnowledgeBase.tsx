import React, { useState, useRef, useCallback } from 'react';
import { useStore } from '../hooks/useStore';
import { useTelegram } from '../hooks/useTelegram';

const KbCommentInput: React.FC<{
  noteId: string; selectedText: string; startOffset: number; endOffset: number;
  onDone: () => void;
}> = ({ noteId, selectedText, startOffset, endOffset, onDone }) => {
  const { addNoteComment } = useStore();
  const { currentUser } = useTelegram();
  const [text, setText] = useState('');
  const [author, setAuthor] = useState(currentUser === 'nikita' ? 'Никита' : currentUser === 'sanya' ? 'Саня' : 'Никита');

  const submit = () => {
    if (!text.trim()) return;
    addNoteComment(noteId, {
      id: 'nc' + Date.now().toString(36),
      author,
      text: text.trim(),
      selectedText,
      startOffset,
      endOffset,
      createdAt: new Date().toISOString(),
    });
    onDone();
  };

  return (
    <div className="kb-comment-form">
      <div className="kb-comment-anchor">«{selectedText.slice(0, 50)}{selectedText.length > 50 ? '…' : ''}»</div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 4, alignItems: 'center' }}>
        <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>as</span>
        <button className={`filter-chip ${author === 'Никита' ? 'active' : ''}`} style={{ fontSize: 9, padding: '1px 6px' }} onClick={() => setAuthor('Никита')}>N</button>
        <button className={`filter-chip ${author === 'Саня' ? 'active' : ''}`} style={{ fontSize: 9, padding: '1px 6px' }} onClick={() => setAuthor('Саня')}>S</button>
      </div>
      <textarea className="input" style={{ fontSize: 10, minHeight: 40 }} placeholder="Comment..." value={text} onChange={e => setText(e.target.value)} autoFocus />
      <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
        <button className="btn-primary" style={{ fontSize: 10, padding: '3px 8px' }} onClick={submit}>Add</button>
        <button className="btn-ghost" style={{ fontSize: 10 }} onClick={onDone}>Cancel</button>
      </div>
    </div>
  );
};

const KnowledgeBase: React.FC = () => {
  const { notes, selectedNoteId, setSelectedNoteId, setEditingNoteId, deleteNote, updateNoteComment, deleteNoteComment } = useStore();
  const [selection, setSelection] = useState<{ text: string; start: number; end: number } | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);

  const backlinks = selectedNoteId ? notes.filter(n => n.links.includes(selectedNoteId)) : [];
  const selectedNote = selectedNoteId ? notes.find(n => n.id === selectedNoteId) : null;

  const handleTextSelection = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !contentRef.current?.contains(sel.anchorNode)) {
      setSelection(null);
      return;
    }
    const text = sel.toString().trim();
    if (!text) { setSelection(null); return; }

    // Get offset within the raw content
    const fullText = selectedNote?.content || '';
    const idx = fullText.indexOf(text);
    if (idx >= 0) {
      setSelection({ text, start: idx, end: idx + text.length });
    }
  }, [selectedNote]);

  // Render content with highlighted comments
  const renderContent = () => {
    if (!selectedNote) return null;
    let content = selectedNote.content;
    const comments = selectedNote.comments || [];

    // Build highlighted version: wrap commented text in <mark>
    const sorted = [...comments].sort((a, b) => a.startOffset - b.startOffset);
    let result = '';
    let lastEnd = 0;
    const highlights: { start: number; end: number; commentId: string }[] = [];

    sorted.forEach(c => {
      if (c.startOffset >= lastEnd && c.endOffset <= content.length) {
        result += escapeHtml(content.slice(lastEnd, c.startOffset));
        result += `<mark class="kb-highlight" data-comment="${c.id}">${escapeHtml(content.slice(c.startOffset, c.endOffset))}</mark>`;
        highlights.push({ start: c.startOffset, end: c.endOffset, commentId: c.id });
        lastEnd = c.endOffset;
      }
    });
    result += escapeHtml(content.slice(lastEnd));

    return { html: result, highlights };
  };

  function escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  const saveEditComment = (noteId: string, commentId: string) => {
    if (!editCommentText.trim()) return;
    updateNoteComment(noteId, commentId, editCommentText.trim());
    setEditingCommentId(null);
  };

  const contentRendered = renderContent();

  return (
    <div className="kb-layout">
      <div className="kb-files">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span className="kb-files-title">Notes</span>
          <button className="btn-ghost" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => setEditingNoteId('new')}>+</button>
        </div>
        {notes.map(note => (
          <div key={note.id} className={`kb-file-item ${selectedNoteId === note.id ? 'active' : ''}`} onClick={() => setSelectedNoteId(note.id)}>
            <span className="kb-file-icon">#</span>{note.title}
          </div>
        ))}
      </div>

      <div className="kb-note-panel" ref={contentRef} onMouseUp={handleTextSelection} onKeyUp={handleTextSelection}>
        {selectedNote ? (
          <div className="kb-note-layout">
            <div className="kb-note-main">
              <div className="kb-note-header">
                <button className="btn-back" onClick={() => setSelectedNoteId(null)}>&larr; All notes</button>
                <div className="kb-note-actions">
                  <button className="btn-ghost" onClick={() => setEditingNoteId(selectedNote.id)}>Edit</button>
                  <button className="btn-ghost" onClick={() => { if (window.confirm('Delete?')) { deleteNote(selectedNote.id); setSelectedNoteId(null); } }}>Del</button>
                </div>
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 600, fontFamily: 'var(--font-mono)', marginBottom: 4 }}>{selectedNote.title}</h2>
              <div className="kb-note-meta">
                <span>Updated {new Date(selectedNote.updatedAt).toLocaleDateString('ru-RU')}</span>
                {selectedNote.tags.length > 0 && <div className="kb-tags">{selectedNote.tags.map(tag => <span key={tag} className="kb-tag">{tag}</span>)}</div>}
              </div>
              <div className="kb-note-content markdown-body" dangerouslySetInnerHTML={{ __html: contentRendered?.html || '' }} />
            </div>

            <div className="kb-refs">
              {selectedNote.links.length > 0 && (
                <div className="kb-refs-section">
                  <div className="kb-refs-title">Links</div>
                  {selectedNote.links.map(linkId => {
                    const linked = notes.find(n => n.id === linkId);
                    return linked ? <button key={linkId} className="kb-refs-item" onClick={() => setSelectedNoteId(linkId)}>{linked.title}</button> : null;
                  })}
                </div>
              )}
              {backlinks.length > 0 && (
                <div className="kb-refs-section">
                  <div className="kb-refs-title">Linked from</div>
                  {backlinks.map(n => <button key={n.id} className="kb-refs-item" onClick={() => setSelectedNoteId(n.id)}>{n.title}</button>)}
                </div>
              )}

              {/* Comments */}
              <div className="kb-refs-section" style={{ marginTop: 8 }}>
                <div className="kb-refs-title">Comments {(selectedNote.comments || []).length}</div>
                {(selectedNote.comments || []).map(c => (
                  <div key={c.id} className="kb-comment-item">
                    <div className="kb-comment-anchor">«{c.selectedText.slice(0, 40)}{c.selectedText.length > 40 ? '…' : ''}»</div>
                    {editingCommentId === c.id ? (
                      <div>
                        <textarea className="input" style={{ fontSize: 10, minHeight: 30 }} value={editCommentText} onChange={e => setEditCommentText(e.target.value)} />
                        <div style={{ display: 'flex', gap: 4, marginTop: 3 }}>
                          <button className="btn-primary" style={{ fontSize: 9, padding: '2px 6px' }} onClick={() => saveEditComment(selectedNote.id, c.id)}>Save</button>
                          <button className="btn-ghost" style={{ fontSize: 9 }} onClick={() => setEditingCommentId(null)}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="kb-comment-author">{c.author} · {new Date(c.createdAt).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}{c.editedAt ? ' (ред.)' : ''}</div>
                        <div className="kb-comment-text">{c.text}</div>
                        <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                          <button className="btn-ghost" style={{ fontSize: 8, padding: '1px 5px' }} onClick={() => { setEditingCommentId(c.id); setEditCommentText(c.text); }}>Edit</button>
                          <button className="btn-ghost" style={{ fontSize: 8, padding: '1px 5px' }} onClick={() => deleteNoteComment(selectedNote.id, c.id)}>Del</button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {/* Selection — new comment */}
                {selection && (
                  <KbCommentInput noteId={selectedNote.id} selectedText={selection.text} startOffset={selection.start} endOffset={selection.end} onDone={() => setSelection(null)} />
                )}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>Select a note</div>
        )}
      </div>
    </div>
  );
};

export default KnowledgeBase;
