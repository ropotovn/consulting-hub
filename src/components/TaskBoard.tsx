import React from 'react';
import { useStore } from '../hooks/useStore';
import { STATUS_LABELS, PRIORITY_LABELS } from '../types';
import type { TaskStatus, Priority } from '../types';

const TaskFilters: React.FC = () => {
  const {
    filterStatus, setFilterStatus,
    filterPriority, setFilterPriority,
    filterAssignee, setFilterAssignee,
  } = useStore();

  const statuses: (TaskStatus | 'all')[] = ['all', 'todo', 'doing', 'done'];
  const priorities: (Priority | 'all')[] = ['all', 'now', 'soon', 'later'];
  const assignees = ['all', 'alex', 'sanya'];

  return (
    <div className="filters">
      <div className="filter-group">
        {statuses.map(s => (
          <button
            key={s}
            className={`filter-chip ${filterStatus === s ? 'active' : ''}`}
            onClick={() => setFilterStatus(s)}
          >
            {s === 'all' ? 'Все' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>
      <div className="filter-group">
        {priorities.map(p => (
          <button
            key={p}
            className={`filter-chip ${filterPriority === p ? 'active' : ''}`}
            onClick={() => setFilterPriority(p)}
          >
            {p === 'all' ? 'Все' : PRIORITY_LABELS[p]}
          </button>
        ))}
      </div>
      <div className="filter-group">
        {assignees.map(a => (
          <button
            key={a}
            className={`filter-chip ${filterAssignee === a ? 'active' : ''}`}
            onClick={() => setFilterAssignee(a)}
          >
            {a === 'all' ? 'Все' : a === 'alex' ? '👤 Алекс' : '👤 Саня'}
          </button>
        ))}
      </div>
    </div>
  );
};

const TaskBoard: React.FC = () => {
  const store = useStore();
  const { tasks, filterStatus, filterPriority, filterAssignee } = store;

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

  const openCreateForm = () => {
    store.setEditingTask(null);
    store.setShowTaskForm(true);
  };

  const openEditForm = (task: typeof tasks[0]) => {
    store.setEditingTask(task);
    store.setShowTaskForm(true);
  };

  return (
    <div className="task-board">
      <div className="board-header">
        <h2>📋 Задачи</h2>
        <button className="btn-primary" onClick={openCreateForm}>
          + Новая задача
        </button>
      </div>

      <TaskFilters />

      <div className="board-columns">
        {(['todo', 'doing', 'done'] as TaskStatus[]).map(status => (
          <div key={status} className="column">
            <div className="column-header">
              <span className="column-title">{STATUS_LABELS[status]}</span>
              <span className="column-count">{grouped[status].length}</span>
            </div>
            <div className="column-cards">
              {grouped[status].map(task => (
                <div
                  key={task.id}
                  className="task-card"
                  onClick={() => openEditForm(task)}
                >
                  <div className="card-priority">
                    {task.priority === 'now' ? '🔥' : task.priority === 'soon' ? '📅' : '💤'}
                  </div>
                  <div className="card-body">
                    <div className="card-title">{task.title}</div>
                    {task.deadline && (
                      <div className="card-deadline">
                        📆 {new Date(task.deadline).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                      </div>
                    )}
                    <div className="card-tags">
                      {task.tags.map(tag => (
                        <span key={tag} className="tag">{tag}</span>
                      ))}
                    </div>
                  </div>
                  <div className="card-assignee">
                    {task.assignee === 'alex' ? '👤' : '🧑‍💻'}
                  </div>
                </div>
              ))}
              {grouped[status].length === 0 && (
                <div className="column-empty">Пока пусто</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TaskBoard;
