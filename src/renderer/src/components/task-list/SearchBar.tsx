import { useState, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useUIStore } from '@/stores/ui-store'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export function SearchBar(): React.JSX.Element {
  const searchQuery = useUIStore((s) => s.searchQuery)
  const setSearchQuery = useUIStore((s) => s.setSearchQuery)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const toggleSearch = (): void => {
    if (isSearchOpen) {
      setSearchQuery('')
      setIsSearchOpen(false)
    } else {
      setIsSearchOpen(true)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  return (
    <div className="flex items-center gap-1">
      <div
        className={cn(
          'overflow-hidden transition-all duration-200 ease-out',
          isSearchOpen ? 'w-40 opacity-100' : 'w-0 opacity-0'
        )}
      >
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索任务..."
            data-shortcut-target="search"
            className="h-7 pl-7 pr-7 text-xs border-muted rounded-md"
          />
          {searchQuery && (
            <button
              aria-label="清除搜索"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2"
            >
              <X className="size-3 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="size-7 shrink-0"
        onClick={toggleSearch}
        data-shortcut-target="search-toggle"
        aria-label={isSearchOpen ? '关闭搜索' : '搜索'}
      >
        {isSearchOpen ? (
          <X className="size-3.5" />
        ) : (
          <Search className="size-3.5" />
        )}
      </Button>
    </div>
  )
}
