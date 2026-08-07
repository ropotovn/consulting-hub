import React, { useState, useCallback } from 'react';
import { useStore } from '../hooks/useStore';
import { STATUS_LABELS, PRIORITY_LABELS, STATUS_DOT } from '../types';
import type { TaskStatus, Priority } from '../types';

const TaskFilters: React.FC = () => {
  const {
    filterStatus, setFilterStatus,
    filterPriority, setFilterPriority,
    filterAssignee, setFilterAssignee,
  } = useStore();

  const statuses: (TaskStatus | 'all')[] = ['all', 'todo', 'doing', 'done'];
  const priorities: (Priority | 'all')[] = ['all', 'now', 'soon', 'later'];
  const assignees = ['all', 'nikita', 'sanya'];

  return (
    <div className="filters">
      {statuses.map(s => (
        <button key={s} className={`filter-chip ${filterStatus === s ? 'active' : ''}`} onClick={() => setFilterStatus(s)}>
          {s === 'all' ? 'All' : STATUS_LABELS[s]}
        </button>
      ))}
      <span className="filter-sep">|</span>
      {priorities.map(p => (
        <button key={p} className={`filter-chip ${filterPriority === p ? 'active' : ''}`} onClick={() => setFilterPriority(p)}>
          {p === 'all' ? 'All' : PRIORITY_LABELS[p]}
        </button>
      ))}
      <span className="filter-sep">|</span>
      {assignees.map(a => (
        <button key={a} className={`filter-chip ${filterAssignee === a ? 'active' : ''}`} onClick={() => setFilterAssignee(a)}>
          {a === 'all' ? 'All' : a === 'nikita' ? 'N' : 'S'}
        </button>
      ))}
    </div>
  );
};

const TaskBoard: React.FC = () => {
  const store = useStore();
  const { tasks, filterStatus, filterPriority, filterAssignee, updateTask } = store;
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<TaskStatus | null>(null);

  const filtered = tasks.filter(t => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    if (filterAssignee !== 'all' && t.assignee !== filterAssignee) return false;
    return true;
  });

  const grouped: Record<TaskStatus, typeof filtered> = {
    todo: filtered.filter(t => t.status === 'todo'),
    doing: filtered.filter(t => t.status === 'doing'),
    done: filtered.filter(t => t.status === 'done'),
  };

  const handleDragStart = useCallback((e: React.DragEvent, taskId: string) => {
    setDragId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    // Make drag image semi-transparent
    const el = e.currentTarget as HTMLElement;
    requestAnimationFrame(() => {
      el.style.opacity = '0.4';
    });
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    setDragId(null);
    setDragOver(null);
    (e.currentTarget as HTMLElement).style.opacity = '1';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(status);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    setDragOver(null);
    if (dragId) {
      updateTask(dragId, { status });
    }
    setDragId(null);
  }, [dragId, updateTask]);

  return (
    <div className="task-board">
      <div className="board-header">
        <h2>Tasks</h2>
        <button className="btn-primary" onClick={() => { store.setEditingTask(null); store.setShowTaskForm(true); }}>
          + New task
        </button>
      </div>

      <TaskFilters />

      <div className="board-columns">
        {(['todo', 'doing', 'done'] as TaskStatus[]).map(status => (
          <div
            key={status}
            className={`column ${dragOver === status ? 'drag-over' : ''}`}
            onDragOver={(e) => handleDragOver(e, status)}
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
                  className={`task-card ${dragId === task.id ? 'dragging' : ''}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task.id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => { store.setEditingTask(task); store.setShowTaskForm(true); }}
                >
                  <div className="card-status-dot" style={{ background: STATUS_DOT[task.status] }} />
                  <div className="card-body">
                    <div className="card-title">{task.title}</div>
                    {task.deadline && (
                      <div className="card-deadline">
                        {new Date(task.deadline).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                      </div>
                    )}
                    <div className="card-tags">
                      {task.tags.map(tag => (
                        <span key={tag} className="tag">{tag}</span>
                      ))}
                    </div>
                  </div>
                  <div className="card-assignee">
                    {task.assignee === 'nikita' ? 'N' : 'S'}
                  </div>
                </div>
              ))}
              {grouped[status].length === 0 && (
                <div className="column-empty">—</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TaskBoard;
