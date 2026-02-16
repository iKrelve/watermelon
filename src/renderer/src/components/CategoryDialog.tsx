import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const PRESET_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#94a3b8', // slate
]

interface CategoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (name: string, color: string | null) => Promise<void>
  initialName?: string
  initialColor?: string | null
  isEditing?: boolean
}

export function CategoryDialog({
  open,
  onOpenChange,
  onSubmit,
  initialName = '',
  initialColor = null,
  isEditing = false,
}: CategoryDialogProps) {
  const [name, setName] = useState(initialName)
  const [color, setColor] = useState<string | null>(initialColor)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset form when dialog opens with new data
  useEffect(() => {
    if (open) {
      setName(initialName)
      setColor(initialColor ?? null)
    }
  }, [open, initialName, initialColor])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) return

    setIsSubmitting(true)
    try {
      await onSubmit(trimmedName, color)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? '编辑分类' : '新建分类'}</DialogTitle>
          <DialogDescription>
            {isEditing ? '修改分类名称或颜色' : '输入分类名称并选择颜色'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Name Input */}
            <div className="space-y-2">
              <label htmlFor="category-name" className="text-sm font-medium">
                名称
              </label>
              <Input
                id="category-name"
                placeholder="分类名称"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>

            {/* Color Picker */}
            <div className="space-y-2">
              <label className="text-sm font-medium">颜色</label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`size-7 rounded-full transition-all hover:scale-110 ${
                      color === c
                        ? 'ring-2 ring-ring ring-offset-2 ring-offset-background'
                        : ''
                    }`}
                    style={{ backgroundColor: c }}
                    aria-label={`颜色 ${c}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || isSubmitting}
            >
              {isSubmitting ? '保存中...' : isEditing ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
