import React, { useState, useCallback, useRef } from 'react';
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

// Get connection points for rendering (used in JSX below)

const Board: React.FC = () => {
  const [blocks, setBlocks] = useState<BoardBlock[]>(() => load(STORAGE_BLOCKS, []));
  const [connections, setConnections] = useState<BoardConnection[]>(() => load(STORAGE_CONNS, []));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // Draw-to-create state
  const [drawing, setDrawing] = useState<{ startX: number; startY: number; x: number; y: number } | null>(null);

  // Arrow drawing state
  const [arrowing, setArrowing] = useState<{ fromId: string; fromX: number; fromY: number; toX: number; toY: number } | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);

  const persistBlocks = (b: BoardBlock[]) => { setBlocks(b); save(STORAGE_BLOCKS, b); };
  const persistConns = (c: BoardConnection[]) => { setConnections(c); save(STORAGE_CONNS, c); };

  // Draw-to-create: mouse down on empty canvas
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.board-block, .board-connector')) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setDrawing({ startX: x, startY: y, x, y });

    const handleMove = (ev: MouseEvent) => {
      const r = canvasRef.current?.getBoundingClientRect();
      if (!r) return;
      setDrawing(prev => prev ? { ...prev, x: ev.clientX - r.left, y: ev.clientY - r.top } : null);
    };
    const handleUp = (ev: MouseEvent) => {
      const r = canvasRef.current?.getBoundingClientRect();
      if (!r) return;
      const endX = ev.clientX - r.left;
      const endY = ev.clientY - r.top;
      const minX = Math.min(drawing?.startX ?? endX, endX);
      const minY = Math.min(drawing?.startY ?? endY, endY);
      const w = Math.max(60, Math.abs(endX - (drawing?.startX ?? endX)));
      const h = Math.max(50, Math.abs(endY - (drawing?.startY ?? endY)));

      const block: BoardBlock = {
        id: newId(), x: minX, y: minY, text: '',
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        width: w, height: h,
      };
      persistBlocks([...blocks, block]);
      setDrawing(null);
      setEditingId(block.id);
      setEditText('');

      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  }, [blocks]);

  // Arrow drawing: drag from connector dot
  const handleConnectorMouseDown = useCallback((e: React.MouseEvent, blockId: string) => {
    e.stopPropagation();
    e.preventDefault();

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    setArrowing({ fromId: blockId, fromX: sx, fromY: sy, toX: sx, toY: sy });

    const handleMove = (ev: MouseEvent) => {
      const r = canvasRef.current?.getBoundingClientRect();
      if (!r) return;
      setArrowing(prev => prev ? { ...prev, toX: ev.clientX - r.left, toY: ev.clientY - r.top } : null);
    };

    const handleUp = (ev: MouseEvent) => {
      const r = canvasRef.current?.getBoundingClientRect();
      if (!r) return;
      const mx = ev.clientX - r.left;
      const my = ev.clientY - r.top;

      // Find which block the arrow landed on
      const target = blocks.find(b =>
        b.id !== blockId &&
        mx >= b.x && mx <= b.x + b.width &&
        my >= b.y && my <= b.y + b.height
      );

      if (target) {
        const exists = connections.find(c =>
          (c.fromId === blockId && c.toId === target.id) ||
          (c.fromId === target.id && c.toId === blockId)
        );
        if (!exists) {
          const conn: BoardConnection = { id: 'c' + newId(), fromId: blockId, toId: target.id };
          persistConns([...connections, conn]);
        }
      }

      setArrowing(null);
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  }, [blocks, connections]);

  // Block drag
  const handleBlockMouseDown = useCallback((e: React.MouseEvent, block: BoardBlock) => {
    if (editingId === block.id) return;
    if ((e.target as HTMLElement).closest('.board-connector')) return;
    e.stopPropagation();

    const startX = block.x;
    const startY = block.y;
    const mouseX = e.clientX;
    const mouseY = e.clientY;

    const handleMove = (ev: MouseEvent) => {
      const dx = ev.clientX - mouseX;
      const dy = ev.clientY - mouseY;
      setBlocks(prev => prev.map(b =>
        b.id === block.id ? { ...b, x: Math.max(0, startX + dx), y: Math.max(0, startY + dy) } : b
      ));
    };
    const handleUp = () => {
      setBlocks(prev => { save(STORAGE_BLOCKS, prev); return prev; });
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  }, [editingId]);

  // Double-click edit
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

  // Resize
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
        {/* SVG arrows */}
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
                <line
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  className="board-arrow-hit"
                  onClick={() => deleteConnection(conn.id)}
                />
              </g>
            );
          })}
          {/* Arrow being drawn */}
          {arrowing && (
            <line
              x1={arrowing.fromX} y1={arrowing.fromY}
              x2={arrowing.toX} y2={arrowing.toY}
              className="board-arrow-preview"
            />
          )}
        </svg>

        {/* Blocks */}
        {blocks.map(block => (
          <div
            key={block.id}
            className="board-block"
            style={{ left: block.x, top: block.y, width: block.width, height: block.height, background: block.color }}
            onMouseDown={(e) => handleBlockMouseDown(e, block)}
            onDoubleClick={() => handleDoubleClick(block)}
          >
            <button className="board-block-delete" onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); }}>×</button>

            {/* Connector dots */}
            {!editingId && (
              <>
                <div className="board-connector board-connector-top" onMouseDown={(e) => handleConnectorMouseDown(e, block.id)} />
                <div className="board-connector board-connector-right" onMouseDown={(e) => handleConnectorMouseDown(e, block.id)} />
                <div className="board-connector board-connector-bottom" onMouseDown={(e) => handleConnectorMouseDown(e, block.id)} />
                <div className="board-connector board-connector-left" onMouseDown={(e) => handleConnectorMouseDown(e, block.id)} />
              </>
            )}

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
            <div className="board-block-resize" onMouseDown={(e) => handleResize(e, block)} />
          </div>
        ))}

        {/* Draw preview */}
        {drawing && (
          <div
            className="board-draw-preview"
            style={{
              left: Math.min(drawing.startX, drawing.x),
              top: Math.min(drawing.startY, drawing.y),
              width: Math.abs(drawing.x - drawing.startX),
              height: Math.abs(drawing.y - drawing.startY),
            }}
          />
        )}

        {blocks.length === 0 && !drawing && (
          <div className="board-empty">drag to create a block</div>
        )}
      </div>
    </div>
  );
};

export default Board;
