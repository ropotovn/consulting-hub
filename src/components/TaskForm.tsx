import React, { useState, useEffect } from 'react';
import { useStore } from '../hooks/useStore';
import { TAG_LABELS, PRIORITY_LABELS, STATUS_LABELS, ASSIGNEE_LABELS } from '../types';
import type { TaskStatus, Priority, TaskTag, Assignee } from '../types';

function newId(): string {
  return 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

const TaskForm: React.FC = () => {
  const { addTask, updateTask, deleteTask, editingTask, setShowTaskForm, setEditingTask } = useStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<Priority>('soon');
  const [tags, setTags] = useState<TaskTag[]>([]);
  const [assignee, setAssignee] = useState<Assignee>('alex');
  const [deadline, setDeadline] = useState('');

  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description);
      setStatus(editingTask.status);
      setPriority(editingTask.priority);
      setTags(editingTask.tags);
      setAssignee(editingTask.assignee);
      setDeadline(editingTask.deadline?.split('T')[0] || '');
    }
  }, [editingTask]);

  const toggleTag = (tag: TaskTag) => {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (editingTask) {
      updateTask(editingTask.id, {
        title: title.trim(),
        description: description.trim(),
        status,
        priority,
        tags,
        assignee,
        deadline: deadline || null,
      });
    } else {
      addTask({
        id: newId(),
        title: title.trim(),
        description: description.trim(),
        status,
        priority,
        tags,
        assignee,
        deadline: deadline || null,
        createdAt: new Date().toISOString(),
        createdBy: 'user',
      });
    }

    handleClose();
  };

  const handleClose = () => {
    setShowTaskForm(false);
    setEditingTask(null);
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <form className="task-form" onSubmit={handleSubmit} onClick={e => e.stopPropagation()}>
        <div className="form-header">
          <h3>{editingTask ? 'Редактировать задачу' : 'Новая задача'}</h3>
          <button type="button" className="btn-close" onClick={handleClose}>✕</button>
        </div>

        <div className="form-body">
          <input
            className="input"
            placeholder="Название задачи"
            value={title}
            onChange={e => setTitle(e.target.value)}
            autoFocus
          />

          <textarea
            className="input textarea"
            placeholder="Описание (опционально)"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
          />

          <div className="form-row">
            <div className="form-field">
              <label>Статус</label>
              <select className="input" value={status} onChange={e => setStatus(e.target.value as TaskStatus)}>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Приоритет</label>
              <select className="input" value={priority} onChange={e => setPriority(e.target.value as Priority)}>
                {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>Ответственный</label>
              <select className="input" value={assignee} onChange={e => setAssignee(e.target.value as Assignee)}>
                {Object.entries(ASSIGNEE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Дедлайн</label>
              <input className="input" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
            </div>
          </div>

          <div className="form-field">
            <label>Теги</label>
            <div className="tag-grid">
              {(Object.entries(TAG_LABELS) as [TaskTag, string][]).map(([tag, label]) => (
                <button
                  key={tag}
                  type="button"
                  className={`tag-btn ${tags.includes(tag) ? 'active' : ''}`}
                  onClick={() => toggleTag(tag)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="form-footer">
          {editingTask && (
            <button
              type="button"
              className="btn-danger"
              onClick={() => {
                deleteTask(editingTask.id);
                handleClose();
              }}
            >
              Удалить
            </button>
          )}
          <button type="submit" className="btn-primary">
            {editingTask ? 'Сохранить' : 'Создать'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TaskForm;
