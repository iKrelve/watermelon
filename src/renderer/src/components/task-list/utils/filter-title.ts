export function getFilterTitle(
  filterView: string,
  categories: { id: string; name: string }[],
  filterCategoryId: string | null,
  tags: { id: string; name: string }[],
  filterTagIds: string[]
): string {
  switch (filterView) {
    case 'all':
      return '全部'
    case 'today':
      return '今天'
    case 'upcoming':
      return '即将到来'
    case 'completed':
      return '已完成'
    case 'category': {
      const cat = categories.find((c) => c.id === filterCategoryId)
      return cat?.name ?? '分类'
    }
    case 'tag': {
      if (filterTagIds.length === 1) {
        const tag = tags.find((t) => t.id === filterTagIds[0])
        return tag?.name ?? '标签'
      }
      return `标签 (${filterTagIds.length})`
    }
    default:
      return '任务'
  }
}
