import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../hooks/useStore';
import { STATUS_LABELS } from '../types';
import type { Notification } from '../types';

const NotificationBell: React.FC = () => {
  const { notifications, unreadCount, markNotifRead, markAllNotifsRead, setEditingTask, setShowTaskForm, tasks } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleClick = (n: Notification) => {
    markNotifRead(n.id);
    const task = tasks.find(t => t.id === n.taskId);
    if (task) {
      setEditingTask(task);
      setShowTaskForm(true);
    }
    setOpen(false);
  };

  const iconMap: Record<string, string> = { comment: '💬', status: '🔄', assign: '👤' };

  return (
    <div className="notif-bell-wrap" ref={ref}>
      <button className={`nav-item notif-bell ${open ? 'active' : ''}`} onClick={() => setOpen(!open)}>
        🔔
        {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {open && (
        <div className="notif-dropdown">
          <div className="notif-header">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <button className="btn-ghost btn-xs" onClick={() => { markAllNotifsRead(); }} style={{ fontSize: 10 }}>
                Mark all read
              </button>
            )}
          </div>
          <div className="notif-list">
            {notifications.length === 0 && (
              <div className="notif-empty">No notifications yet</div>
            )}
            {notifications.map(n => (
              <div
                key={n.id}
                className={`notif-item ${n.read ? '' : 'unread'}`}
                onClick={() => handleClick(n)}
              >
                <span className="notif-icon">{iconMap[n.type] || '📌'}</span>
                <div className="notif-body">
                  <div className="notif-task">{n.taskTitle}</div>
                  <div className="notif-msg">
                    {n.type === 'status' && <span>{STATUS_LABELS[n.message.split(' → ')[0] as keyof typeof STATUS_LABELS] || n.message.split(' → ')[0]} → {STATUS_LABELS[n.message.split(' → ')[1] as keyof typeof STATUS_LABELS] || n.message.split(' → ')[1]}</span>}
                    {n.type === 'comment' && <span><strong>{n.actor}</strong>: {n.message}</span>}
                  </div>
                  <div className="notif-time">{new Date(n.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
