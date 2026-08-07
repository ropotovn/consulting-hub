import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { BoardBlock, BoardConnection } from '../types';

const COLORS = ['#ffffff', '#fff5f7', '#f5fff9', '#f7f9fc', '#fef9ed', '#f7faf5', '#fbf0d9', '#f5f0ff'];

function newId(): string {
  return 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

const STORAGE_BLOCKS = 'shtab_board_blocks';
const STORAGE_CONNS = 'shtab_board_conns';

function load<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
  catch { return fallback; }
}

function save(key: string, data: any) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}

const Board = React.memo(function Board() {
  const [blocks, setBlocks] = useState<BoardBlock[]>(() => load(STORAGE_BLOCKS, []));
  const [connections, setConnections] = useState<BoardConnection[]>(() => load(STORAGE_CONNS, []));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [drawPreview, setDrawPreview] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [arrowPreview, setArrowPreview] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const drawRef = useRef<{ startX: number; startY: number } | null>(null);
  const arrowRef = useRef<{ fromId: string } | null>(null);
  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;
  const connsRef = useRef(connections);
  connsRef.current = connections;

  const persistBlocks = (b: BoardBlock[]) => { setBlocks(b); save(STORAGE_BLOCKS, b); };
  const persistConns = (c: BoardConnection[]) => { setConnections(c); save(STORAGE_CONNS, c); };

  // Canvas coords accounting for scroll
  const canvasXY = (clientX: number, clientY: number) => {
    const el = canvasRef.current;
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    return { x: clientX - r.left + el.scrollLeft, y: clientY - r.top + el.scrollTop };
  };

  // Draw-to-create
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.board-block, .board-connector')) return;
    const { x, y } = canvasXY(e.clientX, e.clientY);
    drawRef.current = { startX: x, startY: y };
    setDrawPreview({ x, y, w: 0, h: 0 });
  }, []);

  useEffect(() => {
    const handleMove = (ev: MouseEvent) => {
      if (!drawRef.current) return;
      const { x, y } = canvasXY(ev.clientX, ev.clientY);
      const s = drawRef.current;
      const minX = Math.min(s.startX, x);
      const minY = Math.min(s.startY, y);
      setDrawPreview({ x: minX, y: minY, w: Math.abs(x - s.startX), h: Math.abs(y - s.startY) });
    };

    const handleUp = (ev: MouseEvent) => {
      if (!drawRef.current) return;
      const { x, y } = canvasXY(ev.clientX, ev.clientY);
      const s = drawRef.current;
      const minX = Math.min(s.startX, x);
      const minY = Math.min(s.startY, y);
      const w = Math.max(60, Math.abs(x - s.startX));
      const h = Math.max(50, Math.abs(y - s.startY));

      const block: BoardBlock = {
        id: newId(), x: minX, y: minY, text: '',
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        width: w, height: h,
      };
      persistBlocks([...blocksRef.current, block]);
      setDrawPreview(null);
      drawRef.current = null;
      setEditingId(block.id);
      setEditText('');
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
  }, []);

  // Arrow drawing
  const handleConnectorMouseDown = useCallback((e: React.MouseEvent, blockId: string) => {
    e.stopPropagation(); e.preventDefault();
    const { x, y } = canvasXY(e.clientX, e.clientY);
    arrowRef.current = { fromId: blockId };
    setArrowPreview({ x1: x, y1: y, x2: x, y2: y });

    const handleMove = (ev: MouseEvent) => {
      if (!arrowRef.current) return;
      const p = canvasXY(ev.clientX, ev.clientY);
      setArrowPreview(prev => prev ? { ...prev, x2: p.x, y2: p.y } : null);
    };

    const handleUp = (ev: MouseEvent) => {
      if (!arrowRef.current) return;
      const p = canvasXY(ev.clientX, ev.clientY);
      const b = blocksRef.current;
      const target = b.find(bl =>
        bl.id !== arrowRef.current!.fromId &&
        p.x >= bl.x && p.x <= bl.x + bl.width &&
        p.y >= bl.y && p.y <= bl.y + bl.height
      );
      if (target) {
        const cs = connsRef.current;
        const exists = cs.find(c =>
          (c.fromId === arrowRef.current!.fromId && c.toId === target.id) ||
          (c.fromId === target.id && c.toId === arrowRef.current!.fromId)
        );
        if (!exists) {
          persistConns([...cs, { id: 'c' + newId(), fromId: arrowRef.current!.fromId, toId: target.id }]);
        }
      }
      setArrowPreview(null);
      arrowRef.current = null;
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  }, []);

  // Block drag — direct DOM to avoid re-renders during drag
  const handleBlockMouseDown = useCallback((e: React.MouseEvent, block: BoardBlock) => {
    if (editingId === block.id) return;
    if ((e.target as HTMLElement).closest('.board-connector')) return;
    e.stopPropagation();

    const el = (e.currentTarget as HTMLElement);
    const startX = block.x;
    const startY = block.y;
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    el.style.zIndex = '10';
    el.style.transition = 'none';

    const handleMove = (ev: MouseEvent) => {
      const dx = ev.clientX - mouseX;
      const dy = ev.clientY - mouseY;
      el.style.transform = `translate(${Math.max(-startX, dx)}px, ${Math.max(-startY, dy)}px)`;
    };

    const handleUp = (ev: MouseEvent) => {
      const dx = ev.clientX - mouseX;
      const dy = ev.clientY - mouseY;
      el.style.transform = '';
      el.style.zIndex = '';
      el.style.transition = '';

      const newX = Math.max(0, startX + dx);
      const newY = Math.max(0, startY + dy);
      if (newX !== startX || newY !== startY) {
        setBlocks(prev => {
          const next = prev.map(b => b.id === block.id ? { ...b, x: newX, y: newY } : b);
          save(STORAGE_BLOCKS, next);
          return next;
        });
      }
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  }, [editingId]);

  const handleDoubleClick = useCallback((block: BoardBlock) => {
    setEditingId(block.id);
    setEditText(block.text);
  }, []);

  const saveEdit = useCallback(() => {
    if (!editingId) return;
    persistBlocks(blocks.map(b => b.id === editingId ? { ...b, text: editText } : b));
    setEditingId(null);
  }, [editingId, editText, blocks]);

  const deleteBlock = useCallback((id: string) => {
    persistBlocks(blocks.filter(b => b.id !== id));
    persistConns(connections.filter(c => c.fromId !== id && c.toId !== id));
    if (editingId === id) setEditingId(null);
  }, [blocks, connections, editingId]);

  const deleteConnection = useCallback((id: string) => {
    persistConns(connections.filter(c => c.id !== id));
  }, [connections]);

  const handleResize = useCallback((e: React.MouseEvent, block: BoardBlock) => {
    e.stopPropagation(); e.preventDefault();
    const sw = block.width; const sh = block.height;
    const sx = e.clientX; const sy = e.clientY;

    const hm = (ev: MouseEvent) => {
      setBlocks(prev => prev.map(b =>
        b.id === block.id ? { ...b, width: Math.max(80, sw + ev.clientX - sx), height: Math.max(50, sh + ev.clientY - sy) } : b
      ));
    };
    const hu = () => {
      setBlocks(prev => { save(STORAGE_BLOCKS, prev); return prev; });
      document.removeEventListener('mousemove', hm);
      document.removeEventListener('mouseup', hu);
    };
    document.addEventListener('mousemove', hm);
    document.addEventListener('mouseup', hu);
  }, []);

  return (
    <div className="board-view">
      <div className="board-header">
        <h2>Board</h2>
        <span className="board-hint">drag to create · drag dots for arrows</span>
      </div>
      <div
        ref={canvasRef}
        className="board-canvas"
        onMouseDown={handleCanvasMouseDown}
      >
        <svg className="board-arrows">
          {connections.map(conn => {
            const from = blocks.find(b => b.id === conn.fromId);
            const to = blocks.find(b => b.id === conn.toId);
            if (!from || !to) return null;
            const x1 = from.x + from.width / 2;
            const y1 = from.y + from.height / 2;
            const x2 = to.x + to.width / 2;
            const y2 = to.y + to.height / 2;
            return (
              <g key={conn.id}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} className="board-arrow-line" />
                <circle cx={x2} cy={y2} r={3} className="board-arrow-head" />
                <line x1={x1} y1={y1} x2={x2} y2={y2} className="board-arrow-hit" onClick={() => deleteConnection(conn.id)} />
              </g>
            );
          })}
          {arrowPreview && (
            <line x1={arrowPreview.x1} y1={arrowPreview.y1} x2={arrowPreview.x2} y2={arrowPreview.y2} className="board-arrow-preview" />
          )}
        </svg>

        {blocks.map(block => (
          <div
            key={block.id}
            className="board-block"
            style={{ left: block.x, top: block.y, width: block.width, height: block.height, background: block.color }}
            onMouseDown={(e) => handleBlockMouseDown(e, block)}
            onDoubleClick={() => handleDoubleClick(block)}
          >
            <button className="board-block-delete" onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); }}>×</button>
            {!editingId && (
              <>
                <div className="board-connector board-connector-top" onMouseDown={(e) => handleConnectorMouseDown(e, block.id)} />
                <div className="board-connector board-connector-right" onMouseDown={(e) => handleConnectorMouseDown(e, block.id)} />
                <div className="board-connector board-connector-bottom" onMouseDown={(e) => handleConnectorMouseDown(e, block.id)} />
                <div className="board-connector board-connector-left" onMouseDown={(e) => handleConnectorMouseDown(e, block.id)} />
              </>
            )}
            {editingId === block.id ? (
              <textarea className="board-block-input" value={editText} onChange={e => setEditText(e.target.value)} onBlur={saveEdit}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(); } }} autoFocus placeholder="..." />
            ) : (
              <div className="board-block-text">{block.text || <span className="board-block-placeholder">...</span>}</div>
            )}
            <div className="board-block-resize" onMouseDown={(e) => handleResize(e, block)} />
          </div>
        ))}

        {drawPreview && (
          <div
            className="board-draw-preview"
            style={{ left: drawPreview.x, top: drawPreview.y, width: drawPreview.w, height: drawPreview.h }}
          />
        )}

        {blocks.length === 0 && !drawPreview && (
          <div className="board-empty">drag to create a block</div>
        )}
      </div>
    </div>
  );
});

export default Board;
