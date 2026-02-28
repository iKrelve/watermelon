const en = {
  // App
  app: {
    name: 'Watermelon',
  },

  // Sidebar
  sidebar: {
    all: 'All',
    today: 'Today',
    upcoming: 'Upcoming',
    completed: 'Completed',
    calendar: 'Calendar',
    categories: 'Categories',
    tags: 'Tags',
    noCategories: 'No categories',
    noTags: 'No tags',
    addCategory: 'Add category',
    edit: 'Edit',
    delete: 'Delete',
    statistics: 'Statistics',
    compactMode: 'Compact mode',
    theme: 'Theme',
    themeLight: 'Light',
    themeDark: 'Dark',
    themeSystem: 'System',
    notes: 'Notes',
    checkUpdate: 'Check for updates',
    checking: 'Checking...',
  },

  // Filter titles
  filter: {
    all: 'All',
    today: 'Today',
    upcoming: 'Upcoming',
    completed: 'Completed',
    categoryFallback: 'Category',
    tagFallback: 'Tag',
    tagMultiple: 'Tags ({{count}})',
    default: 'Tasks',
    taskCount: '{{count}} tasks',
    selectedCount: '{{count}} selected',
  },

  // Sort
  sort: {
    label: 'Sort by',
    default: 'Default',
    byDueDate: 'By due date',
    byPriority: 'By priority',
    byCreatedAt: 'By creation date',
  },

  // Search
  search: {
    placeholder: 'Search tasks...',
    clear: 'Clear search',
    close: 'Close search',
    open: 'Search',
  },

  // Add Task
  addTask: {
    placeholder: 'Add a new task, press Enter to confirm',
    button: 'Add task',
  },

  // Task
  task: {
    ariaLabel: 'Task: {{title}}',
    completedSuffix: ' (completed)',
    overdueSuffix: ' (overdue)',
    markComplete: 'Mark as complete',
    markIncomplete: 'Mark as incomplete',
    collapseSubtasks: 'Collapse subtasks',
    expandSubtasks: 'Expand subtasks',
    overdue: 'Overdue',
  },

  // Priority
  priority: {
    label: 'Priority',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    none: 'None',
  },

  // Empty State
  emptyState: {
    allTitle: 'Task list is empty',
    allHint: 'Create your first task in the input above',
    todayTitle: 'No tasks for today',
    todayHint: 'Enjoy a relaxing day',
    upcomingTitle: 'Nothing planned for the next 7 days',
    completedTitle: 'No completed tasks yet',
    categoryTitle: 'No tasks in this category',
    categoryHint: 'Add tasks to this category in the input above',
    tagTitle: 'No tasks with this tag',
    searchTitle: 'No matching tasks found',
    createTask: 'Create task',
    quickCreate: 'Cmd+N to quick create',
  },

  // Context Menu (batch operations)
  contextMenu: {
    selectedCount: '{{count}} tasks selected',
    batchComplete: 'Complete all',
    setPriority: 'Set priority',
    batchDelete: 'Delete all',
    clearSelection: 'Clear selection',
  },

  // Task Detail
  taskDetail: {
    titlePlaceholder: 'Task title',
    deleteTask: 'Delete task',
    completedBadge: 'Completed',
    descriptionPlaceholder: 'Add notes... Supports Markdown',
    dueDateLabel: 'Due date',
    clearDate: 'Clear date',
    categoryLabel: 'Category',
    noCategory: 'No category',
    tagsLabel: 'Tags',
    newTagPlaceholder: 'New tag...',
    subtasksLabel: 'Subtasks',
    addSubtaskPlaceholder: 'Add subtask...',
    allSubtasksDone: 'All subtasks completed',
    createdAt: 'Created {{date}}',
    updatedAt: 'Updated {{date}}',
    selectTaskHint: 'Select a task to view details',
    quickCreateHint: 'Or press Cmd+N to create a new task',
    confirmDeleteTitle: 'Confirm deletion',
    confirmDeleteMessage: 'Are you sure you want to delete "{{title}}"? This cannot be undone, and subtasks will also be deleted.',
    cancel: 'Cancel',
    delete: 'Delete',
    collapseDetail: 'Collapse details',
    expandDetail: 'Expand details',
    deleteSubtask: 'Delete subtask: {{title}}',
  },

  // Recurrence
  recurrence: {
    tooltip: 'Repeat',
    none: 'No repeat',
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    custom: 'Custom',
    every: 'Every',
    dayUnit: 'days',
    weekUnit: 'weeks',
    monthUnit: 'months',
    timesUnit: 'times',
    monthDay: 'Day',
    monthDaySuffix: 'of the month',
    intervalSuffix: ' ×{{interval}}',
  },

  // Reminder
  reminder: {
    tooltip: 'Reminder',
    clear: 'Clear',
  },

  // Category Dialog
  categoryDialog: {
    editTitle: 'Edit category',
    createTitle: 'New category',
    editDescription: 'Modify category name or color',
    createDescription: 'Enter a name and choose a color',
    nameLabel: 'Name',
    namePlaceholder: 'Category name',
    colorLabel: 'Color',
    cancel: 'Cancel',
    saving: 'Saving...',
    save: 'Save',
    create: 'Create',
  },

  // Statistics
  statistics: {
    title: 'Statistics',
    subtitle: 'View task completion and trends',
    periodDay: 'Today',
    periodWeek: 'This week',
    periodMonth: 'This month',
    totalTasks: 'Total tasks',
    completed: 'Completed',
    completionRate: 'Completion rate',
    pending: 'Pending',
    remaining: 'Remaining tasks',
    trendTitle: 'Last 30 days trend',
    noData: 'No data',
    created: 'Created',
    completedLabel: 'Completed',
  },

  // Calendar
  calendar: {
    weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    moreTasks: '{{count}} more tasks...',
    taskCount: '{{count}} tasks',
    noTasks: 'No tasks for this day',
    completedCount: 'Completed ({{count}})',
    monthTotal: '{{count}} total tasks',
    monthCompleted: '✓ {{count}} completed',
    monthOverdue: '⚠ {{count}} overdue',
    today: 'Today',
    previousMonth: 'Previous month',
    nextMonth: 'Next month',
  },

  // Command Palette
  command: {
    title: 'Command Palette',
    description: 'Search commands, navigate views, or perform actions',
    placeholder: 'Type a command or search...',
    noMatches: 'No matching commands',
    navGroup: 'Navigation',
    allTasks: 'All tasks',
    today: 'Today',
    upcoming: 'Upcoming',
    completed: 'Completed',
    statistics: 'Statistics',
    categoriesGroup: 'Categories',
    tagsGroup: 'Tags',
    notes: 'Notes',
    actionsGroup: 'Actions',
    newTask: 'New task',
    newNote: 'New note',
    completeTask: 'Complete selected task',
    uncompleteTask: 'Mark selected task as incomplete',
    deleteTask: 'Delete selected task',
    searchTask: 'Search tasks',
    windowDataGroup: 'Window & Data',
    compactMode: 'Compact mode',
    exitCompactMode: 'Exit compact mode',
    exportData: 'Export data',
    importData: 'Import data',
    themeGroup: 'Theme',
    lightMode: 'Light mode',
    darkMode: 'Dark mode',
    systemMode: 'System',
    exportSuccess: 'Data exported successfully',
    exportError: 'Data export failed',
    importError: 'Data import failed',
  },

  // Notes
  notes: {
    newNote: 'New note',
    searchPlaceholder: 'Search notes...',
    titlePlaceholder: 'Note title',
    contentPlaceholder: 'Start writing...',
    emptyTitle: 'No notes yet',
    emptyHint: 'Click above to create your first note',
    pin: 'Pin',
    unpin: 'Unpin',
    delete: 'Delete',
    confirmDeleteTitle: 'Confirm deletion',
    confirmDeleteMessage: 'Are you sure you want to delete "{{title}}"? This cannot be undone.',
    cancel: 'Cancel',
    updatedAt: 'Updated {{date}}',
    createdAt: 'Created {{date}}',
    selectNoteHint: 'Select a note to view details',
    createNoteHint: 'Or click above to create a new note',
    insertUrl: 'Insert URL',
    uploadFile: 'Upload file',
    insertLink: 'Insert link',
    removeLink: 'Remove link',
    noteCount: '{{count}} notes',
  },

  // Slash Commands
  slashCommand: {
    heading2: 'Heading 2',
    heading3: 'Heading 3',
    bulletList: 'Bullet list',
    orderedList: 'Ordered list',
    taskList: 'Task list',
    table: 'Table',
    image: 'Image',
    codeBlock: 'Code block',
    blockquote: 'Quote',
    horizontalRule: 'Divider',
    highlight: 'Highlight',
  },

  // Rich Text Editor
  editor: {
    bold: 'Bold',
    italic: 'Italic',
    strikethrough: 'Strikethrough',
    bulletList: 'Bullet list',
    orderedList: 'Ordered list',
    taskList: 'Task list',
    blockquote: 'Blockquote',
    codeBlock: 'Code block',
    horizontalRule: 'Horizontal rule',
    undo: 'Undo',
    redo: 'Redo',
    textColor: 'Text color',
    color: {
      default: 'Default',
      gray: 'Gray',
      brown: 'Brown',
      orange: 'Orange',
      yellow: 'Yellow',
      green: 'Green',
      blue: 'Blue',
      purple: 'Purple',
      pink: 'Pink',
      red: 'Red',
    },
  },

  // Layout
  layout: {
    exitCompactMode: 'Exit compact mode',
    exitCompactModeTooltip: 'Exit compact mode (⌘\\)',
  },

  // Error
  error: {
    title: 'Something went wrong',
    unknownMessage: 'The app encountered an unknown error',
    retry: 'Retry',
    reload: 'Reload page',
    operationFailed: 'Operation failed',
  },

  // Updater
  updater: {
    title: 'Update Available',
    description: 'Watermelon v{{version}} is available. Would you like to update now?',
    releaseNotes: 'Release notes:',
    downloading: 'Downloading...',
    installing: 'Installing...',
    install: 'Update Now',
    updating: 'Updating...',
    later: 'Later',
    error: 'Update failed: {{message}}',
  },

  // Theme
  theme: {
    appleLight: 'Apple Light',
    appleDark: 'Apple Dark',
    pastel: 'Pastel',
    roseLight: 'Rose',
    roseDark: 'Rose Dark',
    forestLight: 'Forest',
    forestDark: 'Forest Dark',
    oceanLight: 'Ocean',
    oceanDark: 'Ocean Dark',
    sunsetLight: 'Sunset',
    sunsetDark: 'Sunset Dark',
    lavenderLight: 'Lavender',
    lavenderDark: 'Lavender Dark',
    midnight: 'Midnight',
    nord: 'Nord',
    monokai: 'Monokai',
    system: 'System',
    categoryLight: 'Light',
    categoryDark: 'Dark',
  },

  // Toast
  toast: {
    importSuccess: 'Data imported successfully',
  },
} as const

export default en