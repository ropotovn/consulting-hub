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

// Smooth bezier between two connector points
function bezierPath(x1: number, y1: number, x2: number, y2: number, side1: ConnectorSide, side2: ConnectorSide): string {
  // Control point offset — how far the curve extends in the connector's direction
  const dist = Math.hypot(x2 - x1, y2 - y1);
  const offset = Math.max(40, dist * 0.4);

  // Direction vector for each connector
  const dir = (side: ConnectorSide): [number, number] => {
    switch (side) {
      case 'top':    return [0, -1];
      case 'bottom': return [0, 1];
      case 'left':   return [-1, 0];
      case 'right':  return [1, 0];
    }
  };

  const [dx1, dy1] = dir(side1);
  const [dx2, dy2] = dir(side2);

  const cp1x = x1 + dx1 * offset;
  const cp1y = y1 + dy1 * offset;
  const cp2x = x2 + dx2 * offset;
  const cp2y = y2 + dy2 * offset;

  return `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
}

const Board = React.memo(function Board() {
  const [blocks, setBlocks] = useState<BoardBlock[]>(() => load(STORAGE_BLOCKS, []));
  const [connections, setConnections] = useState<BoardConnection[]>(() => load(STORAGE_CONNS, []));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [drawPreview, setDrawPreview] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [arrowPreview, setArrowPreview] = useState<{ d: string } | null>(null);
  const [scale, setScale] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [tool, setTool] = useState<'select' | 'draw' | 'arrow' | 'rect' | 'circle'>('select');
  const [blockColor, setBlockColor] = useState('#ffffff');

  const canvasRef = useRef<HTMLDivElement>(null);
  const drawRef = useRef<{ startX: number; startY: number } | null>(null);
  const arrowRef = useRef<{ fromId: string; fromSide: ConnectorSide; x1: number; y1: number } | null>(null);
  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;
  const connsRef = useRef(connections);
  connsRef.current = connections;
  const colorRef = useRef(blockColor);
  colorRef.current = blockColor;
  const toolRef = useRef(tool);
  toolRef.current = tool;

  const persistBlocks = (b: BoardBlock[]) => { setBlocks(b); save(STORAGE_BLOCKS, b); };
  const persistConns = (c: BoardConnection[]) => { setConnections(c); save(STORAGE_CONNS, c); };

  // Pinch zoom refs
  const pinchRef = useRef<{ dist: number; scale: number } | null>(null);
  const panRef = useRef<{ startX: number; startY: number } | null>(null);

  // Touch pan/zoom on canvas
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const handleTouchStart = (e: TouchEvent) => {
      if ((e.target as HTMLElement).closest('.board-block, .board-connector')) return;
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        pinchRef.current = { dist: Math.hypot(dx, dy), scale };
      } else if (e.touches.length === 1) {
        panRef.current = { startX: e.touches[0].clientX - panX, startY: e.touches[0].clientY - panY };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchRef.current) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const newDist = Math.hypot(dx, dy);
        const newScale = Math.min(3, Math.max(0.3, pinchRef.current.scale * (newDist / pinchRef.current.dist)));
        setScale(newScale);
      } else if (e.touches.length === 1 && panRef.current) {
        setPanX(e.touches[0].clientX - panRef.current.startX);
        setPanY(e.touches[0].clientY - panRef.current.startY);
      }
    };

    const handleTouchEnd = () => {
      pinchRef.current = null;
      panRef.current = null;
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: false });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd);
    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [scale, panX, panY]);

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
      const w = Math.abs(x - s.startX);
      const h = Math.abs(y - s.startY);
      drawRef.current = null;
      setDrawPreview(null);

      // Require minimum drag distance to create a block
      if (w < 10 && h < 10) return;
      const minX = Math.min(s.startX, x), minY = Math.min(s.startY, y);
      const bw = Math.max(60, w);
      const bh = Math.max(50, h);
      const t = toolRef.current;
      // Circle: force square dimensions
      const dim = t === 'circle' ? Math.max(bw, bh) : 0;
      const block: BoardBlock = {
        id: newId(), x: minX, y: minY, text: '',
        color: colorRef.current,
        width: dim || bw, height: dim || bh,
        shape: t === 'circle' ? 'circle' : t === 'rect' ? 'rect' : undefined,
      };
      persistBlocks([...blocksRef.current, block]);
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
    setArrowPreview({ d: `M ${p.x} ${p.y}` });

    const handleMove = (ev: MouseEvent) => {
      if (!arrowRef.current) return;
      const ep = canvasXY(ev.clientX, ev.clientY);
      setArrowPreview({ d: bezierPath(p.x, p.y, ep.x, ep.y, side, 'right') });
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
      setArrowPreview(null);
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
        <div className="board-toolbar">
          <button className={`board-tool ${tool === 'select' ? 'active' : ''}`} onClick={() => setTool('select')} title="Select/Move">↖</button>
          <button className={`board-tool ${tool === 'draw' ? 'active' : ''}`} onClick={() => setTool('draw')} title="Draw block">▭</button>
          <button className={`board-tool ${tool === 'rect' ? 'active' : ''}`} onClick={() => setTool('rect')} title="Rectangle">◻</button>
          <button className={`board-tool ${tool === 'circle' ? 'active' : ''}`} onClick={() => setTool('circle')} title="Circle">○</button>
          <span className="board-tool-sep" />
          <button className={`board-tool ${tool === 'arrow' ? 'active' : ''}`} onClick={() => setTool('arrow')} title="Arrow mode">→</button>
          <span className="board-tool-sep" />
          {COLORS.slice(0, 6).map(c => (
            <button
              key={c}
              className={`board-color-dot ${blockColor === c ? 'active' : ''}`}
              style={{ background: c }}
              onClick={() => setBlockColor(c)}
            />
          ))}
        </div>
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
            const path = bezierPath(p1.x, p1.y, p2.x, p2.y, conn.fromSide, conn.toSide);
            return (
              <g key={conn.id}>
                <path d={path} className="board-arrow-path" />
                <circle cx={p2.x} cy={p2.y} r={3.5} className="board-arrow-head" />
                <path d={path} className="board-arrow-hit" onClick={() => deleteConnection(conn.id)} />
              </g>
            );
          })}
          {arrowRef.current && arrowPreview && (
            <path d={arrowPreview.d} className="board-arrow-preview" />
          )}
        </svg>

        {blocks.map(block => (
          <div key={block.id} className="board-block"
            style={{ left: block.x, top: block.y, width: block.width, height: block.height, background: block.color, borderRadius: block.shape === 'circle' ? '50%' : block.shape === 'rect' ? 'var(--radius-sm)' : undefined }}
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
          <div className="board-empty">draw a block</div>
        )}
      </div>
    </div>
  );
});

export default Board;
