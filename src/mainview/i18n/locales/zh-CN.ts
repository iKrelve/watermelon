const zhCN = {
  // App
  app: {
    name: '小西瓜',
  },

  // Sidebar
  sidebar: {
    all: '全部',
    today: '今天',
    upcoming: '即将到来',
    completed: '已完成',
    calendar: '日历',
    categories: '分类',
    tags: '标签',
    noCategories: '暂无分类',
    noTags: '暂无标签',
    addCategory: '添加分类',
    edit: '编辑',
    delete: '删除',
    statistics: '统计',
    compactMode: '简洁模式',
    theme: '主题',
    themeLight: '亮色',
    themeDark: '暗色',
    themeSystem: '跟随系统',
  },

  // Filter titles
  filter: {
    all: '全部',
    today: '今天',
    upcoming: '即将到来',
    completed: '已完成',
    categoryFallback: '分类',
    tagFallback: '标签',
    tagMultiple: '标签 ({{count}})',
    default: '任务',
    taskCount: '{{count}} 个任务',
    selectedCount: '已选 {{count}}',
  },

  // Sort
  sort: {
    label: '排序方式',
    default: '默认',
    byDueDate: '按截止日期',
    byPriority: '按优先级',
    byCreatedAt: '按创建时间',
  },

  // Search
  search: {
    placeholder: '搜索任务...',
    clear: '清除搜索',
    close: '关闭搜索',
    open: '搜索',
  },

  // Add Task
  addTask: {
    placeholder: '添加新任务，按 Enter 确认',
    button: '添加任务',
  },

  // Task
  task: {
    ariaLabel: '任务: {{title}}',
    completedSuffix: ' (已完成)',
    overdueSuffix: ' (已过期)',
    markComplete: '标记为完成',
    markIncomplete: '标记为未完成',
    collapseSubtasks: '收起子任务',
    expandSubtasks: '展开子任务',
    overdue: '已过期',
  },

  // Priority
  priority: {
    label: '优先级',
    high: '高',
    medium: '中',
    low: '低',
    none: '无',
  },

  // Empty State
  emptyState: {
    allTitle: '任务列表是空的',
    allHint: '在上方输入框中创建你的第一个任务',
    todayTitle: '今天没有待办任务',
    todayHint: '享受轻松的一天吧',
    upcomingTitle: '未来 7 天没有安排',
    completedTitle: '还没有已完成的任务',
    categoryTitle: '该分类下没有任务',
    categoryHint: '在上方输入框中添加任务到该分类',
    tagTitle: '该标签下没有任务',
    searchTitle: '没有找到匹配的任务',
    createTask: '创建任务',
    quickCreate: 'Cmd+N 快速创建',
  },

  // Context Menu (batch operations)
  contextMenu: {
    selectedCount: '已选择 {{count}} 个任务',
    batchComplete: '批量完成',
    setPriority: '设置优先级',
    batchDelete: '批量删除',
    clearSelection: '取消选择',
  },

  // Task Detail
  taskDetail: {
    titlePlaceholder: '任务标题',
    deleteTask: '删除任务',
    completedBadge: '已完成',
    descriptionPlaceholder: '添加备注... 支持 Markdown 格式',
    dueDateLabel: '截止日期',
    clearDate: '清除日期',
    categoryLabel: '分类',
    noCategory: '无分类',
    tagsLabel: '标签',
    newTagPlaceholder: '新建标签...',
    subtasksLabel: '子任务',
    addSubtaskPlaceholder: '添加子任务...',
    allSubtasksDone: '所有子任务已完成',
    createdAt: '创建于 {{date}}',
    updatedAt: '更新于 {{date}}',
    selectTaskHint: '选择一个任务查看详情',
    quickCreateHint: '或按 Cmd+N 创建新任务',
    confirmDeleteTitle: '确认删除',
    confirmDeleteMessage: '确定要删除任务「{{title}}」吗？此操作不可撤销，子任务也会一并删除。',
    cancel: '取消',
    delete: '删除',
    collapseDetail: '收起详情',
    expandDetail: '展开详情',
    deleteSubtask: '删除子任务: {{title}}',
  },

  // Recurrence
  recurrence: {
    tooltip: '重复',
    none: '不重复',
    daily: '每天',
    weekly: '每周',
    monthly: '每月',
    custom: '自定义',
    every: '每',
    dayUnit: '天',
    weekUnit: '周',
    monthUnit: '月',
    timesUnit: '次',
    monthDay: '每月第',
    monthDaySuffix: '天',
    intervalSuffix: ' ×{{interval}}',
  },

  // Reminder
  reminder: {
    tooltip: '提醒',
    clear: '清除',
  },

  // Category Dialog
  categoryDialog: {
    editTitle: '编辑分类',
    createTitle: '新建分类',
    editDescription: '修改分类名称或颜色',
    createDescription: '输入分类名称并选择颜色',
    nameLabel: '名称',
    namePlaceholder: '分类名称',
    colorLabel: '颜色',
    cancel: '取消',
    saving: '保存中...',
    save: '保存',
    create: '创建',
  },

  // Statistics
  statistics: {
    title: '统计',
    subtitle: '查看任务完成情况和趋势',
    periodDay: '今日',
    periodWeek: '本周',
    periodMonth: '本月',
    totalTasks: '总任务数',
    completed: '已完成',
    completionRate: '完成率',
    pending: '待完成',
    remaining: '剩余任务',
    trendTitle: '过去 30 天趋势',
    noData: '暂无数据',
    created: '已创建',
    completedLabel: '完成',
  },

  // Calendar
  calendar: {
    weekdays: ['日', '一', '二', '三', '四', '五', '六'],
    moreTasks: '还有 {{count}} 个任务...',
    taskCount: '{{count}} 个任务',
    noTasks: '当天没有任务安排',
    completedCount: '已完成 ({{count}})',
    monthTotal: '共 {{count}} 个任务',
    monthCompleted: '✓ 已完成 {{count}}',
    monthOverdue: '⚠ 已过期 {{count}}',
    today: '今天',
    previousMonth: '上一个月',
    nextMonth: '下一个月',
  },

  // Command Palette
  command: {
    title: '命令面板',
    description: '搜索命令、导航视图或执行操作',
    placeholder: '输入命令或搜索...',
    noMatches: '没有匹配的命令',
    navGroup: '导航',
    allTasks: '全部任务',
    today: '今天',
    upcoming: '即将到来',
    completed: '已完成',
    statistics: '统计',
    categoriesGroup: '分类',
    tagsGroup: '标签',
    actionsGroup: '操作',
    newTask: '新建任务',
    completeTask: '完成选中任务',
    uncompleteTask: '取消完成选中任务',
    deleteTask: '删除选中任务',
    searchTask: '搜索任务',
    windowDataGroup: '窗口 & 数据',
    compactMode: '简洁模式',
    exitCompactMode: '退出简洁模式',
    exportData: '导出数据',
    importData: '导入数据',
    themeGroup: '主题',
    lightMode: '亮色模式',
    darkMode: '暗色模式',
    systemMode: '跟随系统',
    exportSuccess: '数据导出成功',
    exportError: '数据导出失败',
    importError: '数据导入失败',
  },

  // Rich Text Editor
  editor: {
    bold: '加粗',
    italic: '斜体',
    strikethrough: '删除线',
    bulletList: '无序列表',
    orderedList: '有序列表',
    taskList: '任务列表',
    blockquote: '引用',
    codeBlock: '代码块',
    horizontalRule: '分割线',
    undo: '撤销',
    redo: '重做',
  },

  // Layout
  layout: {
    exitCompactMode: '退出简洁模式',
    exitCompactModeTooltip: '退出简洁模式 (⌘\\)',
  },

  // Error
  error: {
    title: '出了点问题',
    unknownMessage: '应用遇到了一个未知错误',
    retry: '重试',
    reload: '刷新页面',
    operationFailed: '操作失败',
  },

  // Toast
  toast: {
    importSuccess: '数据导入成功',
  },
} as const

export default zhCN
