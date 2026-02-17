import type { TFunction } from 'i18next'

export function getFilterTitle(
  t: TFunction,
  filterView: string,
  categories: { id: string; name: string }[],
  filterCategoryId: string | null,
  tags: { id: string; name: string }[],
  filterTagIds: string[]
): string {
  switch (filterView) {
    case 'all':
      return t('filter.all')
    case 'today':
      return t('filter.today')
    case 'upcoming':
      return t('filter.upcoming')
    case 'completed':
      return t('filter.completed')
    case 'category': {
      const cat = categories.find((c) => c.id === filterCategoryId)
      return cat?.name ?? t('filter.categoryFallback')
    }
    case 'tag': {
      if (filterTagIds.length === 1) {
        const tag = tags.find((t) => t.id === filterTagIds[0])
        return tag?.name ?? t('filter.tagFallback')
      }
      return t('filter.tagMultiple', { count: filterTagIds.length })
    }
    default:
      return t('filter.default')
  }
}
