import React, { useState, useCallback, useRef } from 'react';
import type { BoardBlock } from '../types';

const COLORS = ['#fff', '#fff5f7', '#f5fff9', '#f7f9fc', '#fef9ed', '#f7faf5', '#fbf0d9'];

function newBlockId(): string {
  return 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

const STORAGE_KEY = 'shtab_board_blocks';

function loadBlocks(): BoardBlock[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveBlocks(blocks: BoardBlock[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(blocks)); } catch {}
}

const Board: React.FC = () => {
  const [blocks, setBlocks] = useState<BoardBlock[]>(loadBlocks);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; startX: number; startY: number; mouseX: number; mouseY: number } | null>(null);

  const persist = (next: BoardBlock[]) => {
    setBlocks(next);
    saveBlocks(next);
  };

  // Click on empty canvas: add new block
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.board-block')) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left - 70;
    const y = e.clientY - rect.top - 30;
    const block: BoardBlock = {
      id: newBlockId(),
      x: Math.max(0, x),
      y: Math.max(0, y),
      text: '',
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      width: 180,
      height: 80,
    };
    persist([...blocks, block]);
    setEditingId(block.id);
    setEditText('');
  }, [blocks]);

  // Block drag
  const handleBlockMouseDown = useCallback((e: React.MouseEvent, block: BoardBlock) => {
    if (editingId === block.id) return; // don't drag while editing
    e.stopPropagation();
    dragRef.current = { id: block.id, startX: block.x, startY: block.y, mouseX: e.clientX, mouseY: e.clientY };

    const handleMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = ev.clientX - dragRef.current.mouseX;
      const dy = ev.clientY - dragRef.current.mouseY;
      setBlocks(prev => prev.map(b =>
        b.id === dragRef.current!.id
          ? { ...b, x: Math.max(0, dragRef.current!.startX + dx), y: Math.max(0, dragRef.current!.startY + dy) }
          : b
      ));
    };

    const handleUp = () => {
      if (dragRef.current) {
        setBlocks(prev => {
          saveBlocks(prev);
          return prev;
        });
      }
      dragRef.current = null;
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  }, [editingId]);

  // Double-click: edit
  const handleDoubleClick = useCallback((block: BoardBlock) => {
    setEditingId(block.id);
    setEditText(block.text);
  }, []);

  // Save edit
  const saveEdit = useCallback(() => {
    if (!editingId) return;
    persist(blocks.map(b => b.id === editingId ? { ...b, text: editText } : b));
    setEditingId(null);
  }, [editingId, editText, blocks]);

  // Delete
  const deleteBlock = useCallback((id: string) => {
    persist(blocks.filter(b => b.id !== id));
    if (editingId === id) setEditingId(null);
  }, [blocks, editingId]);

  // Resize
  const handleResize = useCallback((e: React.MouseEvent, block: BoardBlock) => {
    e.stopPropagation();
    e.preventDefault();
    const startW = block.width;
    const startH = block.height;
    const startX = e.clientX;
    const startY = e.clientY;

    const handleMove = (ev: MouseEvent) => {
      setBlocks(prev => prev.map(b =>
        b.id === block.id
          ? { ...b, width: Math.max(100, startW + ev.clientX - startX), height: Math.max(60, startH + ev.clientY - startY) }
          : b
      ));
    };
    const handleUp = () => {
      setBlocks(prev => { saveBlocks(prev); return prev; });
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  }, []);

  return (
    <div className="board-view">
      <div className="board-header">
        <h2>Board</h2>
        <span className="board-hint">click to add block · drag to move · double-click to edit</span>
      </div>
      <div
        ref={canvasRef}
        className="board-canvas"
        onClick={handleCanvasClick}
      >
        {blocks.map(block => (
          <div
            key={block.id}
            className="board-block"
            style={{
              left: block.x,
              top: block.y,
              width: block.width,
              height: block.height,
              background: block.color,
            }}
            onMouseDown={(e) => handleBlockMouseDown(e, block)}
            onDoubleClick={() => handleDoubleClick(block)}
          >
            <button className="board-block-delete" onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); }}>
              ×
            </button>
            {editingId === block.id ? (
              <textarea
                className="board-block-input"
                value={editText}
                onChange={e => setEditText(e.target.value)}
                onBlur={saveEdit}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(); } }}
                autoFocus
                placeholder="..."
              />
            ) : (
              <div className="board-block-text">
                {block.text || <span className="board-block-placeholder">...</span>}
              </div>
            )}
            <div
              className="board-block-resize"
              onMouseDown={(e) => handleResize(e, block)}
            />
          </div>
        ))}
        {blocks.length === 0 && (
          <div className="board-empty">click anywhere to add a block</div>
        )}
      </div>
    </div>
  );
};

export default Board;
