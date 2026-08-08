import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useStore } from '../hooks/useStore';
import { STATUS_LABELS, PRIORITY_LABELS, STATUS_DOT } from '../types';
import type { TaskStatus, Priority } from '../types';

const TaskFilters: React.FC = () => {
  const { filterStatus, setFilterStatus, filterPriority, setFilterPriority, filterAssignee, setFilterAssignee } = useStore();
  const statuses: (TaskStatus | 'all')[] = ['all', 'todo', 'doing', 'done'];
  const priorities: (Priority | 'all')[] = ['all', 'now', 'soon', 'later'];
  const assignees = ['all', 'nikita', 'sanya'];

  return (
    <div className="filters">
      {statuses.map(s => (<button key={s} className={`filter-chip ${filterStatus === s ? 'active' : ''}`} onClick={() => setFilterStatus(s)}>{s === 'all' ? 'All' : STATUS_LABELS[s]}</button>))}
      <span className="filter-sep">|</span>
      {priorities.map(p => (<button key={p} className={`filter-chip ${filterPriority === p ? 'active' : ''}`} onClick={() => setFilterPriority(p)}>{p === 'all' ? 'All' : PRIORITY_LABELS[p]}</button>))}
      <span className="filter-sep">|</span>
      {assignees.map(a => (<button key={a} className={`filter-chip ${filterAssignee === a ? 'active' : ''}`} onClick={() => setFilterAssignee(a)}>{a === 'all' ? 'All' : a === 'nikita' ? 'N' : 'S'}</button>))}
    </div>
  );
};

const TaskBoard: React.FC = () => {
  const store = useStore();
  const { tasks, filterStatus, filterPriority, filterAssignee, updateTask, deleteTask } = store;
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<TaskStatus | null>(null);
  const [dragOverTrash, setDragOverTrash] = useState(false);
  const [snappedId, setSnappedId] = useState<string | null>(null);

  // Touch drag state
  const touchRef = useRef<{
    id: string; el: HTMLElement; startX: number; startY: number;
    clone: HTMLElement; offsetX: number; offsetY: number;
    timer: number; moved: boolean;
  } | null>(null);

  const clearTouch = () => {
    const t = touchRef.current;
    if (!t) return;
    if (t.timer) clearTimeout(t.timer);
    if (t.clone) t.clone.remove();
    t.el.style.opacity = '1';
    touchRef.current = null;
  };

  const [sortEnabled, setSortEnabled] = useState(true);

  const filtered = tasks.filter(t => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    if (filterAssignee !== 'all' && t.assignee !== filterAssignee) return false;
    return true;
  });

  const sorted = sortEnabled ? [...filtered].sort((a, b) => {
    const pOrder: Record<string, number> = { now: 0, soon: 1, later: 2 };
    const pDiff = pOrder[a.priority] - pOrder[b.priority];
    if (pDiff !== 0) return pDiff;
    if (!a.deadline && !b.deadline) return 0;
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  }) : filtered;

  const grouped: Record<TaskStatus, typeof sorted> = {
    todo: sorted.filter(t => t.status === 'todo'),
    doing: sorted.filter(t => t.status === 'doing'),
    done: sorted.filter(t => t.status === 'done'),
  };

  // Desktop drag
  const handleDragStart = useCallback((e: React.DragEvent, taskId: string) => {
    setDragId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    const el = e.currentTarget as HTMLElement;
    requestAnimationFrame(() => { el.style.opacity = '0.4'; });
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    setDragId(null); setDragOver(null); setDragOverTrash(false);
    (e.currentTarget as HTMLElement).style.opacity = '1';
  }, []);

  const handleDragOverColumn = useCallback((e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault(); e.dataTransfer.dropEffect = 'move';
    setDragOver(status); setDragOverTrash(false);
  }, []);

  const handleDragLeave = useCallback(() => { setDragOver(null); }, []);

  const handleDrop = useCallback((e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault(); setDragOver(null);
    if (dragId) { updateTask(dragId, { status }); setSnappedId(dragId); setTimeout(() => setSnappedId(null), 500); }
    setDragId(null);
  }, [dragId, updateTask]);

  // Trash zone
  const handleTrashDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOverTrash(true); setDragOver(null);
  }, []);
  const handleTrashDragLeave = useCallback(() => { setDragOverTrash(false); }, []);
  const handleTrashDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOverTrash(false);
    if (dragId) { deleteTask(dragId); }
    setDragId(null);
  }, [dragId, deleteTask]);

  // Touch drag — 300ms hold to activate
  const handleTouchStart = useCallback((e: React.TouchEvent, taskId: string) => {
    const touch = e.touches[0];
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();

    touchRef.current = {
      id: taskId, el,
      startX: touch.clientX, startY: touch.clientY,
      clone: null!, offsetX: 0, offsetY: 0,
      timer: 0, moved: false,
    };

    // After 300ms hold, activate drag mode
    touchRef.current.timer = window.setTimeout(() => {
      const t = touchRef.current;
      if (!t) return;

      el.style.opacity = '0.5';

      const clone = el.cloneNode(true) as HTMLElement;
      clone.style.position = 'fixed';
      clone.style.zIndex = '999';
      clone.style.pointerEvents = 'none';
      clone.style.width = el.offsetWidth + 'px';
      clone.style.opacity = '0.9';
      clone.style.transform = 'rotate(2deg)';
      clone.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
      document.body.appendChild(clone);

      t.clone = clone;
      t.offsetX = t.startX - rect.left;
      t.offsetY = t.startY - rect.top;
      t.moved = true;
      setDragId(taskId);
    }, 300);
  }, []);

  useEffect(() => {
    const handleMove = (ev: TouchEvent) => {
      const t = touchRef.current;
      if (!t || !t.moved) return;
      ev.preventDefault();
      const touch = ev.touches[0];
      t.clone.style.left = (touch.clientX - t.offsetX) + 'px';
      t.clone.style.top = (touch.clientY - t.offsetY) + 'px';

      const cols = document.querySelectorAll('.column');
      let overStatus: TaskStatus | null = null;
      cols.forEach(col => {
        const r = col.getBoundingClientRect();
        if (touch.clientX >= r.left && touch.clientX <= r.right &&
            touch.clientY >= r.top && touch.clientY <= r.bottom) {
          overStatus = col.getAttribute('data-status') as TaskStatus;
        }
      });
      setDragOver(overStatus);
      setDragOverTrash(touch.clientY > window.innerHeight - 60);
    };

    const handleEnd = (ev: TouchEvent) => {
      const t = touchRef.current;
      if (!t) return;
      if (!t.moved) { clearTouch(); return; }
      t.clone.remove();
      t.el.style.opacity = '1';

      const touch = ev.changedTouches[0];
      if (touch.clientY > window.innerHeight - 60) {
        deleteTask(t.id);
      } else {
        const cols = document.querySelectorAll('.column');
        cols.forEach(col => {
          const r = col.getBoundingClientRect();
          if (touch.clientX >= r.left && touch.clientX <= r.right &&
              touch.clientY >= r.top && touch.clientY <= r.bottom) {
            const st = col.getAttribute('data-status') as TaskStatus;
            updateTask(t.id, { status: st });
            setSnappedId(t.id);
            setTimeout(() => setSnappedId(null), 500);
          }
        });
      }

      if (t.timer) clearTimeout(t.timer);
      touchRef.current = null;
      setDragId(null); setDragOver(null); setDragOverTrash(false);
    };

    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleEnd);
    return () => {
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [deleteTask, updateTask]);

  // Need useEffect import at top
  return (
    <div className="task-board">
      <div className="board-header">
        <h2>Tasks</h2>
        <div className="sort-controls">
          <button className={`filter-chip ${sortEnabled ? 'active' : ''}`} onClick={() => setSortEnabled(!sortEnabled)}>
            Priority
          </button>
        </div>
        <button className="btn-primary" onClick={() => { store.setEditingTask(null); store.setShowTaskForm(true); }}>+ New task</button>
      </div>

      <TaskFilters />

      <div className="board-columns">
        {(['todo', 'doing', 'done'] as TaskStatus[]).map(status => (
          <div
            key={status}
            data-status={status}
            className={`column ${dragOver === status ? 'drag-over' : ''}`}
            onDragOver={(e) => handleDragOverColumn(e, status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, status)}
          >
            <div className="column-header">
              <span className="column-title">{STATUS_LABELS[status]}</span>
              <span className="column-count">{grouped[status].length}</span>
            </div>
            <div className="column-cards">
              {grouped[status].map(task => (
                <div
                  key={task.id}
                  className={`task-card ${dragId === task.id ? 'dragging' : ''} ${snappedId === task.id ? 'snapped' : ''} priority-${task.priority}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task.id)}
                  onDragEnd={handleDragEnd}
                  onTouchStart={(e) => handleTouchStart(e, task.id)}
                  onClick={() => { store.setEditingTask(task); store.setShowTaskForm(true); }}
                >
                  <div className="card-status-dot" style={{ background: STATUS_DOT[task.status] }} />
                  <div className="card-body">
                    <div className="card-title">{task.title}</div>
                    {task.deadline && <div className="card-deadline">{new Date(task.deadline).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</div>}
                    <div className="card-tags">{task.tags.map(tag => <span key={tag} className="tag">{tag}</span>)}</div>
                    {task.comments && task.comments.length > 0 && (
                      <div className="card-last-comment">
                        {task.comments[task.comments.length - 1].authorName}: {task.comments[task.comments.length - 1].text.slice(0, 60)}{task.comments[task.comments.length - 1].text.length > 60 ? '…' : ''}
                      </div>
                    )}
                  </div>
                  <div className="card-assignee">{task.assignee === 'nikita' ? 'N' : 'S'}</div>
                </div>
              ))}
              {grouped[status].length === 0 && <div className="column-empty">—</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Delete zone */}
      <div
        className={`trash-zone ${dragOverTrash ? 'trash-active' : ''} ${dragId ? 'trash-visible' : ''}`}
        onDragOver={handleTrashDragOver}
        onDragLeave={handleTrashDragLeave}
        onDrop={handleTrashDrop}
      >
        <span className="trash-icon">drop to delete</span>
      </div>
    </div>
  );
};

export default TaskBoard;
