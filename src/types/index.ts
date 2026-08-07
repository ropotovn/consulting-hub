export type TaskStatus = 'todo' | 'doing' | 'done';
export type Priority = 'now' | 'soon' | 'later';
export type TaskTag = 'product' | 'marketing' | 'tech' | 'legal' | 'finance' | 'other';
export type Assignee = 'alex' | 'sanya';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  tags: TaskTag[];
  assignee: Assignee;
  deadline: string | null; // ISO date
  createdAt: string;
  createdBy: 'agent' | 'user';
  telegramMsgId?: number; // link back to source message
}

export interface Note {
  id: string;
  title: string;
  content: string; // markdown
  tags: string[];
  links: string[]; // note IDs this note links to
  createdAt: string;
  updatedAt: string;
}

export const TAG_LABELS: Record<TaskTag, string> = {
  product: 'Продукт',
  marketing: 'Маркетинг',
  tech: 'Технологии',
  legal: 'Юр. вопросы',
  finance: 'Финансы',
  other: 'Другое',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  now: '🔥 Сейчас',
  soon: '📅 Скоро',
  later: '💤 Потом',
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'К выполнению',
  doing: 'В работе',
  done: 'Готово',
};

export const ASSIGNEE_LABELS: Record<Assignee, string> = {
  alex: 'Алекс',
  sanya: 'Саня',
};

export type View = 'tasks' | 'kb';
