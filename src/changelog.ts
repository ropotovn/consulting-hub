export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

export const changelog: ChangelogEntry[] = [
  {
    version: '0.14',
    date: '2026-08-08',
    changes: [
      'Trash zone — drag a task to the bottom red bar to delete it',
      'Touch drag on mobile — long-press a card to move it between columns',
      'Note autosave — draft is saved every 1.5s and restored after refresh',
      'Themes trimmed to 8 — kept only the most distinct ones',
      'Drag-and-drop between columns with snap animation',
    ],
  },
  {
    version: '0.13',
    date: '2026-08-07',
    changes: [
      'Smooth bezier arrows replacing right-angle orthogonal paths',
      'Arrows curve naturally from any connector point',
    ],
  },
  {
    version: '0.12',
    date: '2026-08-07',
    changes: [
      'Orthogonal point-to-point arrows with smart routing',
      'Connector dots on all four sides of each block',
    ],
  },
  {
    version: '0.11',
    date: '2026-08-07',
    changes: [
      'Fixed draw-to-create positioning with scroll offset',
      'Board lazy-loaded for performance',
      'React.memo on Board component',
    ],
  },
  {
    version: '0.10',
    date: '2026-08-07',
    changes: [
      'Click-and-drag to draw blocks on the board canvas',
      'Arrow connections between blocks',
      'Dotted grid canvas background',
    ],
  },
  {
    version: '0.9',
    date: '2026-08-07',
    changes: [
      'Miro-style board — free-position sticky notes',
      'Resize, drag, edit blocks',
      'Board tab in sidebar and mobile nav',
    ],
  },
  {
    version: '0.8',
    date: '2026-08-07',
    changes: [
      'Magnetic snap + dust particles on task drop',
      'Smooth tile-placement feel',
    ],
  },
  {
    version: '0.7',
    date: '2026-08-07',
    changes: [
      'Manual N/S toggle for comment attribution',
      'Telegram ID auto-detection for comment author',
    ],
  },
  {
    version: '0.6',
    date: '2026-08-07',
    changes: [
      'Drag-and-drop tasks between columns',
      'Grab cursor and drag preview',
    ],
  },
  {
    version: '0.5',
    date: '2026-08-07',
    changes: [
      'Comment threads on tasks',
      'Nikita/Sanya attribution via Telegram initData',
    ],
  },
  {
    version: '0.4',
    date: '2026-08-07',
    changes: [
      'Comments on tasks with N/S attribution',
      'Mobile responsive fixes',
      '3 new themes: Pink, Green, Dark Green',
    ],
  },
  {
    version: '0.3',
    date: '2026-08-07',
    changes: [
      '10 color themes with theme picker',
      'Mobile bottom navigation',
      'KB auto-article cron job — 2x daily',
    ],
  },
  {
    version: '0.2',
    date: '2026-08-07',
    changes: [
      'Monochrome redesign — Linear × Obsidian aesthetic',
      'JetBrains Mono for UI, clean typography',
      'Denser layout, less padding',
      'Obsidian-style backlinks in knowledge base',
    ],
  },
  {
    version: '0.1',
    date: '2026-08-06',
    changes: [
      'Initial release — task tracker + knowledge base',
      'Three-column kanban board',
      'Markdown notes with wiki-style [[links]]',
      'Telegram Mini App integration',
    ],
  },
];
