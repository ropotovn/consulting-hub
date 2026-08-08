import type { Task, Note } from '../types';

export const sampleTasks: Task[] = [
  {
    id: 't1',
    title: 'Определить MVP-фичи для стартапа',
    description: 'Нужно сесть и расписать минимальный набор фич, с которым можно выходить к первым пользователям. Отсечь всё лишнее.',
    status: 'done',
    priority: 'now',
    tags: ['product'],
    assignee: 'nikita',
    deadline: '2026-08-10',
    createdAt: '2026-08-05T10:00:00Z',
    createdBy: 'agent',
    comments: [],
  },
  {
    id: 't2',
    title: 'Собрать лендинг на конструкторе',
    description: 'Быстрый лендинг на Tilda/Webflow для проверки спроса. 3 экрана: проблема, решение, CTA.',
    status: 'doing',
    priority: 'now',
    tags: ['marketing', 'product'],
    assignee: 'sanya',
    deadline: '2026-08-15',
    createdAt: '2026-08-06T12:00:00Z',
    createdBy: 'user',
    comments: [],
  },
  {
    id: 't3',
    title: 'Провести 5 проблемных интервью',
    description: 'Найти и опросить 5 потенциальных пользователей. Сфокусироваться на боли, а не на решении.',
    status: 'todo',
    priority: 'now',
    tags: ['product', 'marketing'],
    assignee: 'nikita',
    deadline: '2026-08-18',
    createdAt: '2026-08-07T09:00:00Z',
    createdBy: 'agent',
    comments: [],
  },
  {
    id: 't4',
    title: 'Разобраться с юрлицом и налогами',
    description: 'ИП или ООО? УСН или патенты? Нужна консультация бухгалтера.',
    status: 'todo',
    priority: 'soon',
    tags: ['legal', 'finance'],
    assignee: 'sanya',
    deadline: '2026-08-25',
    createdAt: '2026-08-07T10:00:00Z',
    createdBy: 'user',
    comments: [],
  },
  {
    id: 't5',
    title: 'Накидать структуру базы знаний',
    description: 'Какие разделы нужны: продукт, рынок, конкуренты, метрики, гипотезы. Сделать каркас.',
    status: 'doing',
    priority: 'soon',
    tags: ['product'],
    assignee: 'nikita',
    deadline: '2026-08-12',
    createdAt: '2026-08-06T08:00:00Z',
    createdBy: 'agent',
    comments: [],
  },
  {
    id: 't6',
    title: 'Сравнить аналоги: ценовой анализ',
    description: 'Собрать 5-7 конкурентов, расписать их цены и модели монетизации. Таблица в Notion/Google Sheets.',
    status: 'todo',
    priority: 'later',
    tags: ['marketing', 'product'],
    assignee: 'sanya',
    deadline: null,
    createdAt: '2026-08-07T11:00:00Z',
    createdBy: 'agent',
    comments: [],
  },
  {
    id: 't7',
    title: 'Выбрать стек для MVP',
    description: 'Фронт, бэк, хостинг, база. Чтобы быстро и не переписывать через месяц.',
    status: 'todo',
    priority: 'soon',
    tags: ['tech'],
    assignee: 'nikita',
    deadline: '2026-08-20',
    createdAt: '2026-08-07T12:00:00Z',
    createdBy: 'user',
    comments: [],
  },
];

export const sampleNotes: Note[] = [
  {
    id: 'n1',
    title: 'Концепция стартапа',
    content: `# Концепция стартапа

## Проблема
Люди тратят слишком много времени на [X], хотя могли бы [Y].

## Решение
Платформа, которая **автоматизирует** [X] через:
1. Умный подбор
2. Персонализацию
3. Интеграции

## Целевая аудитория
- Сегмент A: ...
- Сегмент B: ...

## Бизнес-модель
Freemium → подписка от $X/мес.

## Ключевая метрика
Retention D30 > 40%`,
    tags: ['продукт', 'стратегия'],
    links: ['n2', 'n3'],
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-05T14:00:00Z',
    comments: [],
  },
  {
    id: 'n2',
    title: 'Анализ конкурентов',
    content: `# Анализ конкурентов

## Прямые конкуренты
| Название | Цена | Сильные стороны | Слабые стороны |
|----------|------|-----------------|----------------|
| Comp A   | $29  | UI/UX           | Нет API        |
| Comp B   | $15  | Функционал      | Сложный онборд |

## Косвенные конкуренты
- Excel / Google Sheets
- Ручной процессинг

## Наше преимущество
- Скорость онбординга
- Интеграция с Telegram
- Цена`,
    tags: ['рынок', 'конкуренты'],
    links: ['n1'],
    createdAt: '2026-08-03T11:00:00Z',
    updatedAt: '2026-08-06T09:00:00Z',
    comments: [],
  },
  {
    id: 'n3',
    title: 'Гипотезы для проверки',
    content: `# Гипотезы для проверки

## H1: Люди готовы платить за автоматизацию [X]
**Метрика:** Конверсия в оплату с триала > 5%
**Метод:** Лендинг + pre-order

## H2: Основной канал — Telegram
**Метрика:** CAC через Telegram < $5
**Метод:** Таргет + органический рост

## H3: Retentions строится на привычке
**Метрика:** D30 > 40%
**Метод:** Ежедневные уведомления + геймификация`,
    tags: ['гипотезы', 'рост'],
    links: ['n1', 'n2'],
    createdAt: '2026-08-04T15:00:00Z',
    updatedAt: '2026-08-07T10:00:00Z',
    comments: [],
  },
  {
    id: 'n4',
    title: 'Метрики и KPI',
    content: `# Метрики и KPI

## North Star Metric
**Weekly Active Users** совершивших [ключевое действие]

## Воронка
1. Посетитель лендинга
2. Регистрация
3. Активация (первое [действие])
4. Возврат D7
5. Возврат D30
6. Оплата

## Текущие бенчмарки
- Конверсия в регистрацию: ~3%
- Активация: ~40%
- D7 retention: ~20%`,
    tags: ['метрики', 'аналитика'],
    links: ['n1'],
    createdAt: '2026-08-05T09:00:00Z',
    updatedAt: '2026-08-05T09:00:00Z',
    comments: [],
  },
];
