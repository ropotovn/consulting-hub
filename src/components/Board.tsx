import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { BoardBlock, BoardConnection, ConnectorSide } from '../types';

const COLORS = ['#ffffff', '#fff5f7', '#f5fff9', '#f7f9fc', '#fef9ed', '#f7faf5', '#fbf0d9', '#f5f0ff'];

function newId(): string {
  return 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

const STORAGE_BLOCKS = 'shtab_board_blocks';
const STORAGE_CONNS = 'shtab_board_conns_v2';

function load<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
  catch { return fallback; }
}

function save(key: string, data: any) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}

// Connector position on a block
function connectorXY(block: BoardBlock, side: ConnectorSide): { x: number; y: number } {
  switch (side) {
    case 'top':    return { x: block.x + block.width / 2, y: block.y };
    case 'bottom': return { x: block.x + block.width / 2, y: block.y + block.height };
    case 'left':   return { x: block.x, y: block.y + block.height / 2 };
    case 'right':  return { x: block.x + block.width, y: block.y + block.height / 2 };
  }
}

// Which side of the block is closest to a given point
function closestSide(block: BoardBlock, px: number, py: number): ConnectorSide {
  const cx = block.x + block.width / 2;
  const cy = block.y + block.height / 2;
  const sides: { side: ConnectorSide; dist: number }[] = [
    { side: 'top', dist: Math.abs(py - block.y) + Math.abs(px - cx) * 0.3 },
    { side: 'bottom', dist: Math.abs(py - block.y - block.height) + Math.abs(px - cx) * 0.3 },
    { side: 'left', dist: Math.abs(px - block.x) + Math.abs(py - cy) * 0.3 },
    { side: 'right', dist: Math.abs(px - block.x - block.width) + Math.abs(py - cy) * 0.3 },
  ];
  return sides.sort((a, b) => a.dist - b.dist)[0].side;
}

// Orthogonal path between two connector points
function orthoPath(x1: number, y1: number, x2: number, y2: number, side1: ConnectorSide, side2: ConnectorSide): string {
  const margin = 30;
  const midY = (y1 + y2) / 2;

  // Same side or adjacent — use mid-point routing
  if (side1 === side2) {
    // Route outward then across
    if (side1 === 'top' || side1 === 'bottom') {
      const outY = side1 === 'top' ? Math.min(y1, y2) - margin : Math.max(y1, y2) + margin;
      return `M ${x1} ${y1} L ${x1} ${outY} L ${x2} ${outY} L ${x2} ${y2}`;
    } else {
      const outX = side1 === 'left' ? Math.min(x1, x2) - margin : Math.max(x1, x2) + margin;
      return `M ${x1} ${y1} L ${outX} ${y1} L ${outX} ${y2} L ${x2} ${y2}`;
    }
  }

  // Top/bottom connecting to left/right — use L-shaped path
  if ((side1 === 'top' || side1 === 'bottom') && (side2 === 'left' || side2 === 'right')) {
    return `M ${x1} ${y1} L ${x1} ${y2} L ${x2} ${y2}`;
  }
  if ((side1 === 'left' || side1 === 'right') && (side2 === 'top' || side2 === 'bottom')) {
    return `M ${x1} ${y1} L ${x2} ${y1} L ${x2} ${y2}`;
  }

  // Opposite sides — S-curve
  return `M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}`;
}

const Board = React.memo(function Board() {
  const [blocks, setBlocks] = useState<BoardBlock[]>(() => load(STORAGE_BLOCKS, []));
  const [connections, setConnections] = useState<BoardConnection[]>(() => load(STORAGE_CONNS, []));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [drawPreview, setDrawPreview] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const drawRef = useRef<{ startX: number; startY: number } | null>(null);
  const arrowRef = useRef<{ fromId: string; fromSide: ConnectorSide; x1: number; y1: number } | null>(null);
  const arrowPathRef = useRef<string>('');
  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;
  const connsRef = useRef(connections);
  connsRef.current = connections;

  const persistBlocks = (b: BoardBlock[]) => { setBlocks(b); save(STORAGE_BLOCKS, b); };
  const persistConns = (c: BoardConnection[]) => { setConnections(c); save(STORAGE_CONNS, c); };

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
      setDrawPreview({ x: Math.min(s.startX, x), y: Math.min(s.startY, y), w: Math.abs(x - s.startX), h: Math.abs(y - s.startY) });
    };
    const handleUp = (ev: MouseEvent) => {
      if (!drawRef.current) return;
      const { x, y } = canvasXY(ev.clientX, ev.clientY);
      const s = drawRef.current;
      const minX = Math.min(s.startX, x), minY = Math.min(s.startY, y);
      const block: BoardBlock = {
        id: newId(), x: minX, y: minY, text: '',
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        width: Math.max(60, Math.abs(x - s.startX)), height: Math.max(50, Math.abs(y - s.startY)),
      };
      persistBlocks([...blocksRef.current, block]);
      setDrawPreview(null); drawRef.current = null;
      setEditingId(block.id); setEditText('');
    };
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    return () => { document.removeEventListener('mousemove', handleMove); document.removeEventListener('mouseup', handleUp); };
  }, []);

  // Arrow drawing — per side
  const handleConnectorMouseDown = useCallback((e: React.MouseEvent, blockId: string, side: ConnectorSide) => {
    e.stopPropagation(); e.preventDefault();
    const block = blocksRef.current.find(b => b.id === blockId);
    if (!block) return;
    const p = connectorXY(block, side);
    arrowRef.current = { fromId: blockId, fromSide: side, x1: p.x, y1: p.y };
    arrowPathRef.current = `M ${p.x} ${p.y}`;

    const handleMove = (ev: MouseEvent) => {
      if (!arrowRef.current) return;
      const ep = canvasXY(ev.clientX, ev.clientY);
      arrowPathRef.current = orthoPath(p.x, p.y, ep.x, ep.y, side, 'right');
    };

    const handleUp = (ev: MouseEvent) => {
      if (!arrowRef.current) return;
      const ep = canvasXY(ev.clientX, ev.clientY);
      const b = blocksRef.current;
      const target = b.find(bl =>
        bl.id !== arrowRef.current!.fromId &&
        ep.x >= bl.x && ep.x <= bl.x + bl.width &&
        ep.y >= bl.y && ep.y <= bl.y + bl.height
      );
      if (target) {
        const targetSide = closestSide(target, ep.x, ep.y);
        const cs = connsRef.current;
        const dup = cs.find(c =>
          (c.fromId === arrowRef.current!.fromId && c.toId === target.id) ||
          (c.fromId === target.id && c.toId === arrowRef.current!.fromId)
        );
        if (!dup) {
          persistConns([...cs, { id: 'c' + newId(), fromId: arrowRef.current!.fromId, fromSide: side, toId: target.id, toSide: targetSide }]);
        }
      }
      arrowRef.current = null;
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  }, []);

  // Block drag — direct DOM
  const handleBlockMouseDown = useCallback((e: React.MouseEvent, block: BoardBlock) => {
    if (editingId === block.id) return;
    if ((e.target as HTMLElement).closest('.board-connector')) return;
    e.stopPropagation();
    const el = (e.currentTarget as HTMLElement);
    const sx = block.x, sy = block.y, mx = e.clientX, my = e.clientY;
    el.style.zIndex = '10'; el.style.transition = 'none';

    const hm = (ev: MouseEvent) => {
      el.style.transform = `translate(${Math.max(-sx, ev.clientX - mx)}px, ${Math.max(-sy, ev.clientY - my)}px)`;
    };
    const hu = (ev: MouseEvent) => {
      el.style.transform = ''; el.style.zIndex = ''; el.style.transition = '';
      const nx = Math.max(0, sx + ev.clientX - mx), ny = Math.max(0, sy + ev.clientY - my);
      if (nx !== sx || ny !== sy) {
        setBlocks(prev => {
          const next = prev.map(b => b.id === block.id ? { ...b, x: nx, y: ny } : b);
          save(STORAGE_BLOCKS, next); return next;
        });
      }
      document.removeEventListener('mousemove', hm);
      document.removeEventListener('mouseup', hu);
    };
    document.addEventListener('mousemove', hm);
    document.addEventListener('mouseup', hu);
  }, [editingId]);

  const handleDoubleClick = useCallback((block: BoardBlock) => { setEditingId(block.id); setEditText(block.text); }, []);
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
    const sw = block.width, sh = block.height, sx = e.clientX, sy = e.clientY;
    const hm = (ev: MouseEvent) => {
      setBlocks(prev => prev.map(b =>
        b.id === block.id ? { ...b, width: Math.max(80, sw + ev.clientX - sx), height: Math.max(50, sh + ev.clientY - sy) } : b
      ));
    };
    const hu = () => {
      setBlocks(prev => { save(STORAGE_BLOCKS, prev); return prev; });
      document.removeEventListener('mousemove', hm); document.removeEventListener('mouseup', hu);
    };
    document.addEventListener('mousemove', hm); document.addEventListener('mouseup', hu);
  }, []);

  return (
    <div className="board-view">
      <div className="board-header">
        <h2>Board</h2>
        <span className="board-hint">drag to create · drag dots for arrows</span>
      </div>
      <div ref={canvasRef} className="board-canvas" onMouseDown={handleCanvasMouseDown}>
        <svg className="board-arrows">
          {connections.map(conn => {
            const from = blocks.find(b => b.id === conn.fromId);
            const to = blocks.find(b => b.id === conn.toId);
            if (!from || !to) return null;
            const p1 = connectorXY(from, conn.fromSide);
            const p2 = connectorXY(to, conn.toSide);
            const path = orthoPath(p1.x, p1.y, p2.x, p2.y, conn.fromSide, conn.toSide);
            return (
              <g key={conn.id}>
                <path d={path} className="board-arrow-path" />
                <circle cx={p2.x} cy={p2.y} r={3} className="board-arrow-head" />
                <path d={path} className="board-arrow-hit" onClick={() => deleteConnection(conn.id)} />
              </g>
            );
          })}
          {arrowRef.current && (
            <path d={arrowPathRef.current} className="board-arrow-preview" />
          )}
        </svg>

        {blocks.map(block => (
          <div key={block.id} className="board-block"
            style={{ left: block.x, top: block.y, width: block.width, height: block.height, background: block.color }}
            onMouseDown={(e) => handleBlockMouseDown(e, block)}
            onDoubleClick={() => handleDoubleClick(block)}>
            <button className="board-block-delete" onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); }}>×</button>
            {!editingId && (
              <>
                <div className="board-connector board-connector-top"    onMouseDown={(e) => handleConnectorMouseDown(e, block.id, 'top')} />
                <div className="board-connector board-connector-right"  onMouseDown={(e) => handleConnectorMouseDown(e, block.id, 'right')} />
                <div className="board-connector board-connector-bottom" onMouseDown={(e) => handleConnectorMouseDown(e, block.id, 'bottom')} />
                <div className="board-connector board-connector-left"   onMouseDown={(e) => handleConnectorMouseDown(e, block.id, 'left')} />
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
          <div className="board-draw-preview" style={{ left: drawPreview.x, top: drawPreview.y, width: drawPreview.w, height: drawPreview.h }} />
        )}
        {blocks.length === 0 && !drawPreview && (
          <div className="board-empty">drag to create a block</div>
        )}
      </div>
    </div>
  );
});

export default Board;
