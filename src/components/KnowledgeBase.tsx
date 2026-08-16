import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useStore } from '../hooks/useStore';
import { useAuth } from '../hooks/useAuth';
import { useWorkspaces } from '../hooks/useWorkspaces';
import { NOTE_TYPE_LABELS } from '../types';
import MentionInput from './MentionInput';
import { renderMentioned } from '../mentions';
import UserChip from './UserChip';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { VIDEO_EXT, youtubeId } from '../media';

// Turn Obsidian-style wikilinks [[id|Title]] (and [[id]]) into internal anchor
// links (#note:id) that the custom `a` renderer below routes to the note.
function preprocessWikiLinks(content: string): string {
  return content
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, (_m, id, title) => `[${title}](#note:${id})`)
    .replace(/\[\[([^\]]+)\]\]/g, (_m, id) => `[${id}](#note:${id})`);
}

const KbCommentInput: React.FC<{
  noteId: string; selectedText: string; startOffset: number; endOffset: number;
  onDone: () => void;
}> = ({ noteId, selectedText, startOffset, endOffset, onDone }) => {
  const { addNoteComment } = useStore();
  const { currentUserRef } = useAuth();
  const { memberRefs } = useWorkspaces();
  const [text, setText] = useState('');

  const submit = () => {
    if (!text.trim()) return;
    addNoteComment(noteId, {
      id: 'nc' + Date.now().toString(36),
      author: currentUserRef ?? { id: 'unknown', name: 'Unknown', username: '' },
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
      <MentionInput value={text} onChange={setText} members={memberRefs} placeholder="Comment... (@ to mention)" textarea autoFocus style={{ fontSize: 10, minHeight: 40 }} />
      <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
        <button className="btn-primary" style={{ fontSize: 10, padding: '3px 8px' }} onClick={submit}>Add</button>
        <button className="btn-ghost" style={{ fontSize: 10 }} onClick={onDone}>Cancel</button>
      </div>
    </div>
  );
};

const KnowledgeBase: React.FC = () => {
  const { notes, selectedNoteId, setSelectedNoteId, setEditingNoteId, deleteNote, updateNoteComment, deleteNoteComment, togglePinNote } = useStore();
  const [selection, setSelection] = useState<{ text: string; start: number; end: number } | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [hoveredCommentId, setHoveredCommentId] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const formActiveRef = useRef(false);
  const [filesWidth, setFilesWidth] = useState(() => {
    const v = parseInt(localStorage.getItem('shtab_kb_files_width') || '180', 10);
    return Math.min(480, Math.max(140, isNaN(v) ? 180 : v));
  });
  const widthRef = useRef(filesWidth);
  const [resizing, setResizing] = useState(false);

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = widthRef.current;
    setResizing(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    const onMove = (ev: MouseEvent) => {
      const w = Math.min(480, Math.max(140, startWidth + (ev.clientX - startX)));
      widthRef.current = w;
      setFilesWidth(w);
    };
    const onUp = () => {
      setResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      localStorage.setItem('shtab_kb_files_width', String(widthRef.current));
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const backlinks = selectedNoteId ? notes.filter(n => n.links.includes(selectedNoteId)) : [];
  const selectedNote = selectedNoteId ? notes.find(n => n.id === selectedNoteId) : null;

  const handleTextSelection = useCallback(() => {
    if (formActiveRef.current) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) {
      if (!formActiveRef.current) setSelection(null);
      return;
    }
    const text = sel.toString().trim();
    if (!text || text.length < 2) { setSelection(null); return; }

    // Walk text nodes to find offset in raw markdown
    const range = sel.getRangeAt(0);
    const walker = document.createTreeWalker(contentRef.current!, NodeFilter.SHOW_TEXT);
    let charCount = 0;
    let startOffset = -1;
    let endOffset = -1;
    let node: Text | null;
    while ((node = walker.nextNode() as Text)) {
      const nodeText = node.textContent || '';
      if (node === range.startContainer) {
        startOffset = charCount + range.startOffset;
      }
      if (node === range.endContainer) {
        endOffset = charCount + range.endOffset;
        break;
      }
      charCount += nodeText.length;
    }

    if (startOffset >= 0 && endOffset > startOffset) {
      formActiveRef.current = true;
      setSelection({ text, start: startOffset, end: endOffset });
    }
  }, []);

  const clearSelection = useCallback(() => {
    setSelection(null);
    formActiveRef.current = false;
  }, []);

  // Apply comment highlights to the rendered markdown
  useEffect(() => {
    if (!contentRef.current || !selectedNote) return;
    const comments = selectedNote.comments || [];

    // Remove existing highlights before applying new ones
    contentRef.current.querySelectorAll('mark.kb-highlight').forEach(m => {
      const parent = m.parentNode;
      if (parent) {
        while (m.firstChild) parent.insertBefore(m.firstChild, m);
        parent.removeChild(m);
      }
    });

    if (!comments.length) return;

    const walker = document.createTreeWalker(contentRef.current, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    let node: Text | null;
    while ((node = walker.nextNode() as Text)) {
      if (node.textContent) textNodes.push(node);
    }

    // Build a flat text representation
    let flat = '';
    const nodeMap: { node: Text; start: number; end: number }[] = [];
    textNodes.forEach(n => {
      const start = flat.length;
      flat += n.textContent || '';
      nodeMap.push({ node: n, start, end: flat.length });
    });

    // Apply highlights
    const sorted = [...comments].sort((a, b) => a.startOffset - b.startOffset);
    sorted.forEach(c => {
      if (c.startOffset >= flat.length || c.endOffset > flat.length) return;
      // Find which text node contains this offset
      for (const m of nodeMap) {
        if (c.startOffset >= m.start && c.startOffset < m.end) {
          const localStart = c.startOffset - m.start;
          const localEnd = Math.min(c.endOffset, m.end) - m.start;
          if (localStart >= 0 && localEnd > localStart) {
            const range = document.createRange();
            range.setStart(m.node, localStart);
            range.setEnd(m.node, localEnd);
            const mark = document.createElement('mark');
            mark.className = 'kb-highlight';
            mark.dataset.comment = c.id;
            mark.onmouseenter = () => setHoveredCommentId(c.id);
            mark.onmouseleave = () => setHoveredCommentId(null);
            try { range.surroundContents(mark); } catch {}
            break;
          }
        }
      }
    });
  }, [selectedNote]);

  // When a comment is hovered (either via the sidebar item or the anchored text),
  // visually emphasize its anchored text in the article body.
  useEffect(() => {
    if (!contentRef.current) return;
    const marks = contentRef.current.querySelectorAll('mark.kb-highlight');
    marks.forEach(m => {
      m.classList.toggle('kb-highlight-active', m.getAttribute('data-comment') === hoveredCommentId);
    });
  }, [hoveredCommentId, selectedNote]);

  const scrollToComment = (commentId: string) => {
    if (!contentRef.current) return;
    const mark = contentRef.current.querySelector(`mark.kb-highlight[data-comment="${commentId}"]`);
    if (mark) mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHoveredCommentId(commentId);
  };

  const saveEditComment = (noteId: string, commentId: string) => {
    if (!editCommentText.trim()) return;
    updateNoteComment(noteId, commentId, editCommentText.trim());
    setEditingCommentId(null);
  };

  return (
    <div className="kb-layout" style={{ '--kb-files-width': filesWidth + 'px' } as React.CSSProperties}>
      <div className="kb-files">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span className="kb-files-title">Notes</span>
          <button className="btn-ghost" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => setEditingNoteId('new')}>+</button>
        </div>
        {[...notes].sort((a, b) => {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }).map(note => {
          const isNew = (Date.now() - new Date(note.createdAt).getTime()) < 172800000;
          const commentCount = (note.comments || []).length;
          const lastAuthor = commentCount > 0 ? note.comments![commentCount - 1].author : null;
          return (
          <div key={note.id} className={`kb-file-item ${selectedNoteId === note.id ? 'active' : ''}`} onClick={() => setSelectedNoteId(note.id)}>
            <span className="kb-file-icon">{note.pinned ? '◆' : '·'}</span>
            <span className="kb-file-title">{note.title}</span>
            {isNew && <span className="kb-badge-new">new</span>}
            {commentCount > 0 && <span className="kb-badge-comment" title={`${commentCount} comment${commentCount > 1 ? 's' : ''}${lastAuthor ? ' by ' + lastAuthor : ''}`}>{commentCount}</span>}
            <button className="kb-pin-btn" onClick={(e) => { e.stopPropagation(); togglePinNote(note.id); }} title={note.pinned ? 'Unpin' : 'Pin'}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill={note.pinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.2">
                <circle cx="5" cy="2" r="1.2" />
                <line x1="5" y1="3" x2="5" y2="8.5" />
                <line x1="3" y1="5" x2="7" y2="5" />
              </svg>
            </button>
          </div>
        );})}
      </div>

      <div className={`kb-resizer ${resizing ? 'dragging' : ''}`} onMouseDown={startResize} title="Drag to resize" />

      <div className="kb-note-panel">
        {selectedNote ? (
          <div className="kb-note-layout">
            <div className="kb-note-main" onMouseUp={handleTextSelection}>
              <div className="kb-note-header">
                <button className="btn-back" onClick={() => setSelectedNoteId(null)}>&larr; All notes</button>
                <div className="kb-note-actions">
                  <button className="btn-ghost" onClick={() => setEditingNoteId(selectedNote.id)}>Edit</button>
                  <button className="btn-ghost" onClick={() => { if (window.confirm('Delete?')) { deleteNote(selectedNote.id); setSelectedNoteId(null); } }}>Del</button>
                </div>
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 600, fontFamily: 'var(--font-mono)', marginBottom: 4 }}>{selectedNote.title}</h2>
              <div className="kb-note-meta">
                {selectedNote.type && <span className={`kb-type-badge kb-type-${selectedNote.type}`}>{NOTE_TYPE_LABELS[selectedNote.type]}</span>}
                <span>Updated {new Date(selectedNote.updatedAt).toLocaleDateString('ru-RU')}</span>
                {selectedNote.tags.length > 0 && <div className="kb-tags">{selectedNote.tags.map(tag => <span key={tag} className="kb-tag">{tag}</span>)}</div>}
              </div>
              <div ref={contentRef} className="kb-note-content markdown-body">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    a: ({ href, children }) => {
                      if (!href) return <>{children}</>;
                      if (href.startsWith('#note:')) {
                        return <button className="kb-wikilink" onClick={() => setSelectedNoteId(href.slice(6))}>{children}</button>;
                      }
                      const yt = youtubeId(href);
                      if (yt) {
                        return (
                          <div className="kb-embed">
                            <iframe src={`https://www.youtube.com/embed/${yt}`} title="YouTube" allowFullScreen loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
                          </div>
                        );
                      }
                      if (VIDEO_EXT.test(href)) {
                        return <video className="kb-video" src={href} controls preload="metadata" />;
                      }
                      return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
                    },
                    img: ({ src, alt }) => <img className="kb-img" src={src} alt={alt || ''} loading="lazy" />,
                  }}
                >{preprocessWikiLinks(selectedNote.content)}</ReactMarkdown>
              </div>
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
                  <div key={c.id} className={`kb-comment-item ${hoveredCommentId === c.id ? 'kb-comment-hover' : ''}`}
                    onMouseEnter={() => setHoveredCommentId(c.id)}
                    onMouseLeave={() => setHoveredCommentId(null)}
                    onClick={() => scrollToComment(c.id)}>
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
                        <div className="kb-comment-author"><UserChip userId={c.author.id} label={c.author.name} /> · {new Date(c.createdAt).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}{c.editedAt ? ' (ред.)' : ''}</div>
                        <div className="kb-comment-text">{renderMentioned(c.text)}</div>
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
                  <KbCommentInput noteId={selectedNote.id} selectedText={selection.text} startOffset={selection.start} endOffset={selection.end} onDone={clearSelection} />
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
