export type TaskStatus = 'todo' | 'doing' | 'done';
export type Priority = 'now' | 'soon' | 'later';
export type TaskTag = 'product' | 'marketing' | 'tech' | 'legal' | 'finance' | 'other';
export type Assignee = 'nikita' | 'sanya';

export interface TaskComment {
  id: string;
  author: Assignee;
  authorName: string;
  text: string;
  createdAt: string;
  editedAt?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  tags: TaskTag[];
  assignee: Assignee;
  deadline: string | null;
  createdAt: string;
  createdBy: 'agent' | 'user';
  telegramMsgId?: number;
  comments: TaskComment[];
}

export type NoteType = 'guide' | 'case' | 'boost' | 'insight' | 'checklist';

export const NOTE_TYPE_LABELS: Record<NoteType, string> = {
  guide: 'Guide',
  case: 'Case',
  boost: 'Boost',
  insight: 'Insight',
  checklist: 'Checklist',
};

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  links: string[];
  createdAt: string;
  updatedAt: string;
  comments: NoteComment[];
  pinned?: boolean;
  type?: NoteType;
}

export interface NoteComment {
  id: string;
  author: string;
  text: string;
  selectedText: string;
  startOffset: number;
  endOffset: number;
  createdAt: string;
  editedAt?: string;
}

export const TAG_LABELS: Record<TaskTag, string> = {
  product: 'Продукт',
  marketing: 'Маркетинг',
  tech: 'Тех',
  legal: 'Юр.',
  finance: 'Финансы',
  other: 'Другое',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  now: 'Сейчас',
  soon: 'Скоро',
  later: 'Потом',
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'К выполнению',
  doing: 'В работе',
  done: 'Готово',
};

export const ASSIGNEE_LABELS: Record<Assignee, string> = {
  nikita: 'Никита',
  sanya: 'Саня',
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  now: '#000',
  soon: '#888',
  later: '#ccc',
};

export const STATUS_DOT: Record<TaskStatus, string> = {
  todo: '#ccc',
  doing: '#ffb800',
  done: '#22c55e',
};

export type View = 'tasks' | 'kb' | 'board';

export type NotifType = 'comment' | 'status' | 'assign';

export interface Notification {
  id: string;
  type: NotifType;
  taskId: string;
  taskTitle: string;
  actor: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export interface BoardBlock {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  width: number;
  height: number;
  shape?: 'rect' | 'circle';
}

export type ConnectorSide = 'top' | 'right' | 'bottom' | 'left';

export interface BoardConnection {
  id: string;
  fromId: string;
  fromSide: ConnectorSide;
  toId: string;
  toSide: ConnectorSide;
  arrowStyle?: 'none' | 'end' | 'both';
}
