import React, { useState, useEffect } from 'react';
import { useStore } from '../hooks/useStore';
import { TAG_LABELS, PRIORITY_LABELS, STATUS_LABELS, ASSIGNEE_LABELS } from '../types';
import type { TaskStatus, Priority, TaskTag, Assignee, TaskComment } from '../types';

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
  const [assignee, setAssignee] = useState<Assignee>('nikita');
  const [deadline, setDeadline] = useState('');
  const [commentText, setCommentText] = useState('');
  const [taskComments, setTaskComments] = useState<TaskComment[]>([]);

  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description);
      setStatus(editingTask.status);
      setPriority(editingTask.priority);
      setTags(editingTask.tags);
      setAssignee(editingTask.assignee);
      setDeadline(editingTask.deadline?.split('T')[0] || '');
      setTaskComments(editingTask.comments || []);
    } else {
      setTitle(''); setDescription(''); setStatus('todo'); setPriority('soon');
      setTags([]); setAssignee('nikita'); setDeadline('');
      setTaskComments([]);
    }
  }, [editingTask]);

  const toggleTag = (tag: TaskTag) => {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const addComment = () => {
    if (!commentText.trim()) return;
    const comment: TaskComment = {
      id: 'c' + Date.now().toString(36),
      author: assignee,
      authorName: ASSIGNEE_LABELS[assignee],
      text: commentText.trim(),
      createdAt: new Date().toISOString(),
    };
    setTaskComments(prev => [...prev, comment]);
    setCommentText('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (editingTask) {
      updateTask(editingTask.id, {
        title: title.trim(), description: description.trim(),
        status, priority, tags, assignee,
        deadline: deadline || null, comments: taskComments,
      });
    } else {
      addTask({
        id: newId(), title: title.trim(), description: description.trim(),
        status, priority, tags, assignee,
        deadline: deadline || null,
        createdAt: new Date().toISOString(), createdBy: 'user',
        comments: [],
      });
    }
    handleClose();
  };

  const handleClose = () => { setShowTaskForm(false); setEditingTask(null); };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <form className="task-form" onSubmit={handleSubmit} onClick={e => e.stopPropagation()}>
        <div className="form-header">
          <h3>{editingTask ? 'Edit task' : 'New task'}</h3>
          <button type="button" className="btn-close" onClick={handleClose}>x</button>
        </div>

        <div className="form-body">
          <input className="input" placeholder="Task title" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
          <textarea className="input textarea" placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} rows={2} />

          <div className="form-row">
            <div className="form-field">
              <label>Status</label>
              <select className="input" value={status} onChange={e => setStatus(e.target.value as TaskStatus)}>
                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>Priority</label>
              <select className="input" value={priority} onChange={e => setPriority(e.target.value as Priority)}>
                {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>Assignee</label>
              <select className="input" value={assignee} onChange={e => setAssignee(e.target.value as Assignee)}>
                {Object.entries(ASSIGNEE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>Deadline</label>
              <input className="input" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
            </div>
          </div>

          <div className="form-field">
            <label>Tags</label>
            <div className="tag-grid">
              {(Object.entries(TAG_LABELS) as [TaskTag, string][]).map(([tag, label]) => (
                <button key={tag} type="button" className={`tag-btn ${tags.includes(tag) ? 'active' : ''}`} onClick={() => toggleTag(tag)}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {editingTask && (
            <div className="comments-section">
              <div className="comments-title">Comments</div>
              {taskComments.map(c => (
                <div key={c.id} className="comment-item">
                  <div className="comment-author">
                    {c.authorName} · {new Date(c.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="comment-text">{c.text}</div>
                </div>
              ))}
              {taskComments.length === 0 && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '4px 0', fontFamily: 'var(--font-mono)' }}>
                  No comments yet
                </div>
              )}
              <div className="comment-input-row">
                <input
                  className="input"
                  placeholder="Add comment..."
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addComment(); } }}
                />
                <button type="button" className="btn-primary" onClick={addComment}>Send</button>
              </div>
            </div>
          )}
        </div>

        <div className="form-footer">
          {editingTask && (
            <button type="button" className="btn-danger" onClick={() => { deleteTask(editingTask.id); handleClose(); }}>
              Delete
            </button>
          )}
          <button type="submit" className="btn-primary">
            {editingTask ? 'Save' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TaskForm;
