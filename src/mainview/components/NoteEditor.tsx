import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { Image } from '@tiptap/extension-image'
import { Link } from '@tiptap/extension-link'
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table'
import { Highlight } from '@tiptap/extension-highlight'
import { Color } from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'
import { useEffect, useRef, useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import {
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Code,
  Minus,
  Undo,
  Redo,
  ImageIcon,
  LinkIcon,
  TableIcon,
  Highlighter,
  Heading2,
  Heading3,
  Palette,
  RemoveFormatting,
} from 'lucide-react'

interface NoteEditorProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string
  className?: string
  editable?: boolean
}

/**
 * Enhanced rich text editor for Notes.
 * Extends the base TipTap editor with:
 * - Image support (base64 inline or URL)
 * - Link support (auto-detect URLs)
 * - Table support
 * - Text highlight
 * - Slash commands (/ menu)
 *
 * Content is stored as HTML.
 */
export function NoteEditor({
  content,
  onChange,
  placeholder,
  className,
  editable = true,
}: NoteEditorProps): React.JSX.Element {
  const { t } = useTranslation()
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const suppressNextUpdate = useRef(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Placeholder.configure({
        placeholder: placeholder ?? t('notes.contentPlaceholder'),
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Image.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: 'rounded-md max-w-full',
        },
      }),
      Link.configure({
        openOnClick: true,
        autolink: true,
        HTMLAttributes: {
          class: 'text-primary underline underline-offset-2 cursor-pointer',
        },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse table-auto w-full',
        },
      }),
      TableRow,
      TableHeader,
      TableCell,
      Highlight.configure({
        multicolor: true,
      }),
      TextStyle,
      Color,
    ],
    content,
    editable,
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm dark:prose-invert max-w-none',
          'focus:outline-none min-h-[200px] px-4 py-3',
          'text-sm leading-relaxed',
          // Task list styles
          '[&_ul[data-type="taskList"]]:list-none [&_ul[data-type="taskList"]]:pl-0',
          '[&_ul[data-type="taskList"]_li]:flex [&_ul[data-type="taskList"]_li]:items-start [&_ul[data-type="taskList"]_li]:gap-2',
          '[&_ul[data-type="taskList"]_li_label]:mt-0.5',
          '[&_ul[data-type="taskList"]_li_div]:flex-1',
          // Table styles
          '[&_table]:border [&_table]:border-border/60',
          '[&_th]:border [&_th]:border-border/60 [&_th]:p-2 [&_th]:bg-muted/30 [&_th]:font-medium',
          '[&_td]:border [&_td]:border-border/60 [&_td]:p-2',
          // Image styles
          '[&_img]:rounded-md [&_img]:max-w-full',
          // Highlight (mark) styles
          '[&_mark]:rounded [&_mark]:px-0.5'
        ),
      },
      handleDrop: (view, event, _slice, moved) => {
        // Handle image drop
        if (!moved && event.dataTransfer?.files.length) {
          const files = Array.from(event.dataTransfer.files)
          const images = files.filter((f) => f.type.startsWith('image/'))
          if (images.length > 0) {
            event.preventDefault()
            images.forEach((file) => {
              const reader = new FileReader()
              reader.onload = (e): void => {
                const result = e.target?.result
                if (typeof result === 'string') {
                  const { schema } = view.state
                  const node = schema.nodes.image?.create({ src: result })
                  if (node) {
                    const pos = view.posAtCoords({
                      left: event.clientX,
                      top: event.clientY,
                    })
                    if (pos) {
                      const tr = view.state.tr.insert(pos.pos, node)
                      view.dispatch(tr)
                    }
                  }
                }
              }
              reader.readAsDataURL(file)
            })
            return true
          }
        }
        return false
      },
      handlePaste: (view, event) => {
        // Handle image paste
        const items = event.clipboardData?.items
        if (items) {
          for (const item of Array.from(items)) {
            if (item.type.startsWith('image/')) {
              event.preventDefault()
              const file = item.getAsFile()
              if (file) {
                const reader = new FileReader()
                reader.onload = (e): void => {
                  const result = e.target?.result
                  if (typeof result === 'string') {
                    const { schema } = view.state
                    const node = schema.nodes.image?.create({ src: result })
                    if (node) {
                      const tr = view.state.tr.replaceSelectionWith(node)
                      view.dispatch(tr)
                    }
                  }
                }
                reader.readAsDataURL(file)
              }
              return true
            }
          }
        }
        return false
      },
    },
    onUpdate: ({ editor: e }) => {
      if (suppressNextUpdate.current) {
        suppressNextUpdate.current = false
        return
      }
      onChangeRef.current(e.getHTML())
    },
  })

  // Sync external content changes
  useEffect(() => {
    if (!editor) return
    const currentHTML = editor.getHTML()
    if (currentHTML !== content) {
      suppressNextUpdate.current = true
      editor.commands.setContent(content, false)
    }
  }, [editor, content])

  useEffect(() => {
    if (!editor) return
    editor.setEditable(editable)
  }, [editor, editable])

  if (!editor) return <div className={cn('min-h-[200px]', className)} />

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Toolbar */}
      {editable && <NoteToolbar editor={editor} />}

      {/* Editor */}
      <EditorContent editor={editor} className="flex-1 overflow-auto" />
    </div>
  )
}

// ============================================================
// Toolbar
// ============================================================

function NoteToolbar({ editor }: { editor: Editor }): React.JSX.Element {
  const { t } = useTranslation()

  const ToolbarBtn = useCallback(
    ({
      onClick,
      isActive,
      icon: Icon,
      tooltip,
    }: {
      onClick: () => void
      isActive?: boolean
      icon: React.ComponentType<{ className?: string }>
      tooltip: string
    }): React.JSX.Element => (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              'size-7 rounded',
              isActive && 'bg-accent text-accent-foreground'
            )}
            onClick={onClick}
            tabIndex={-1}
          >
            <Icon className="size-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    ),
    []
  )

  return (
    <TooltipProvider delayDuration={400}>
      <div className="flex items-center gap-0.5 border-b border-border/40 px-2 py-1 flex-wrap">
        {/* Headings */}
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          icon={Heading2}
          tooltip={t('slashCommand.heading2')}
        />
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive('heading', { level: 3 })}
          icon={Heading3}
          tooltip={t('slashCommand.heading3')}
        />

        <div className="w-px h-4 bg-border/60 mx-0.5" />

        {/* Basic formatting */}
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          icon={Bold}
          tooltip={t('editor.bold')}
        />
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          icon={Italic}
          tooltip={t('editor.italic')}
        />
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          icon={Strikethrough}
          tooltip={t('editor.strikethrough')}
        />
        <HighlightColorButton editor={editor} />

        <div className="w-px h-4 bg-border/60 mx-0.5" />

        {/* Lists */}
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          icon={List}
          tooltip={t('editor.bulletList')}
        />
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          icon={ListOrdered}
          tooltip={t('editor.orderedList')}
        />
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          isActive={editor.isActive('taskList')}
          icon={ListChecks}
          tooltip={t('editor.taskList')}
        />

        <div className="w-px h-4 bg-border/60 mx-0.5" />

        {/* Blocks */}
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          icon={Quote}
          tooltip={t('editor.blockquote')}
        />
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          isActive={editor.isActive('codeBlock')}
          icon={Code}
          tooltip={t('editor.codeBlock')}
        />
        <ToolbarBtn
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          icon={Minus}
          tooltip={t('editor.horizontalRule')}
        />

        <div className="w-px h-4 bg-border/60 mx-0.5" />

        {/* Table */}
        <ToolbarBtn
          onClick={() =>
            editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
          }
          icon={TableIcon}
          tooltip={t('slashCommand.table')}
        />

        {/* Image */}
        <ImageInsertButton editor={editor} />

        {/* Link */}
        <LinkInsertButton editor={editor} />

        {/* Text Color */}
        <TextColorButton editor={editor} />

        {/* Undo/Redo */}
        <div className="ml-auto flex items-center gap-0.5">
          <ToolbarBtn
            onClick={() => editor.chain().focus().undo().run()}
            icon={Undo}
            tooltip={t('editor.undo')}
          />
          <ToolbarBtn
            onClick={() => editor.chain().focus().redo().run()}
            icon={Redo}
            tooltip={t('editor.redo')}
          />
        </div>
      </div>
    </TooltipProvider>
  )
}

// ============================================================
// Image Insert Button (with popover for URL input)
// ============================================================

function ImageInsertButton({ editor }: { editor: Editor }): React.JSX.Element {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUrlInsert = (): void => {
    if (url.trim()) {
      editor.chain().focus().setImage({ src: url.trim() }).run()
      setUrl('')
      setOpen(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (ev): void => {
        const result = ev.target?.result
        if (typeof result === 'string') {
          editor.chain().focus().setImage({ src: result }).run()
        }
      }
      reader.readAsDataURL(file)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 rounded"
              tabIndex={-1}
            >
              <ImageIcon className="size-3.5" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {t('slashCommand.image')}
        </TooltipContent>
      </Tooltip>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">
            {t('slashCommand.image')}
          </div>
          <Input
            placeholder="https://..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleUrlInsert()
            }}
            className="h-8 text-xs"
          />
          <div className="flex gap-2">
            <Button size="sm" className="h-7 text-xs flex-1" onClick={handleUrlInsert}>
              {t('notes.insertUrl')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs flex-1"
              onClick={() => fileInputRef.current?.click()}
            >
              {t('notes.uploadFile')}
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ============================================================
// Link Insert Button
// ============================================================

// ============================================================
// Text Color Button (with color palette popover)
// ============================================================

const HIGHLIGHT_COLORS = [
  { name: 'none', value: '' },
  { name: 'yellow', value: '#fef08a', darkValue: '#854d0e99' },
  { name: 'green', value: '#bbf7d0', darkValue: '#16653499' },
  { name: 'blue', value: '#bfdbfe', darkValue: '#1e40af99' },
  { name: 'purple', value: '#ddd6fe', darkValue: '#5b21b699' },
  { name: 'pink', value: '#fbcfe8', darkValue: '#9d174d99' },
  { name: 'orange', value: '#fed7aa', darkValue: '#9a340099' },
  { name: 'red', value: '#fecaca', darkValue: '#991b1b99' },
  { name: 'gray', value: '#e5e7eb', darkValue: '#37415199' },
] as const

const TEXT_COLORS = [
  { name: 'default', value: '' },
  { name: 'gray', value: '#6b7280' },
  { name: 'brown', value: '#92400e' },
  { name: 'orange', value: '#ea580c' },
  { name: 'yellow', value: '#ca8a04' },
  { name: 'green', value: '#16a34a' },
  { name: 'blue', value: '#2563eb' },
  { name: 'purple', value: '#7c3aed' },
  { name: 'pink', value: '#db2777' },
  { name: 'red', value: '#dc2626' },
] as const

function HighlightColorButton({ editor }: { editor: Editor }): React.JSX.Element {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const currentHighlight =
    (editor.getAttributes('highlight').color as string | undefined) ?? ''

  const handleColorSelect = (color: string): void => {
    if (color === '') {
      editor.chain().focus().unsetHighlight().run()
    } else {
      editor.chain().focus().toggleHighlight({ color }).run()
    }
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                'size-7 rounded relative',
                editor.isActive('highlight') && 'bg-accent text-accent-foreground'
              )}
              tabIndex={-1}
            >
              <Highlighter className="size-3.5" />
              {/* Color indicator bar */}
              {currentHighlight && (
                <span
                  className="absolute bottom-0.5 left-1.5 right-1.5 h-0.5 rounded-full"
                  style={{ backgroundColor: currentHighlight }}
                />
              )}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {t('editor.highlightColor')}
        </TooltipContent>
      </Tooltip>
      <PopoverContent className="w-auto p-2" align="start">
        <div className="space-y-1.5">
          <div className="text-xs font-medium text-muted-foreground px-1">
            {t('editor.highlightColor')}
          </div>
          <div className="grid grid-cols-5 gap-1">
            {HIGHLIGHT_COLORS.map((c) => (
              <Tooltip key={c.name}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      'size-6 rounded-md border border-border/40 flex items-center justify-center',
                      'hover:scale-110 transition-transform',
                      currentHighlight === c.value &&
                        c.value !== '' &&
                        'ring-2 ring-primary ring-offset-1 ring-offset-background',
                      !currentHighlight &&
                        c.value === '' &&
                        'ring-2 ring-primary ring-offset-1 ring-offset-background'
                    )}
                    style={{
                      backgroundColor: c.value === '' ? 'transparent' : c.value,
                    }}
                    onClick={() => handleColorSelect(c.value)}
                  >
                    {c.value === '' && (
                      <RemoveFormatting className="size-3 text-muted-foreground" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {t(`editor.highlightColors.${c.name}`)}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function TextColorButton({ editor }: { editor: Editor }): React.JSX.Element {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const currentColor =
    (editor.getAttributes('textStyle').color as string | undefined) ?? ''

  const handleColorSelect = (color: string): void => {
    if (color === '') {
      editor.chain().focus().unsetColor().run()
    } else {
      editor.chain().focus().setColor(color).run()
    }
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 rounded relative"
              tabIndex={-1}
            >
              <Palette className="size-3.5" />
              {/* Color indicator bar */}
              <span
                className="absolute bottom-0.5 left-1.5 right-1.5 h-0.5 rounded-full"
                style={{
                  backgroundColor: currentColor || 'currentColor',
                }}
              />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {t('editor.textColor')}
        </TooltipContent>
      </Tooltip>
      <PopoverContent className="w-auto p-2" align="start">
        <div className="space-y-1.5">
          <div className="text-xs font-medium text-muted-foreground px-1">
            {t('editor.textColor')}
          </div>
          <div className="grid grid-cols-5 gap-1">
            {TEXT_COLORS.map((c) => (
              <Tooltip key={c.name}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      'size-6 rounded-md border border-border/40 flex items-center justify-center',
                      'hover:scale-110 transition-transform',
                      currentColor === c.value && 'ring-2 ring-primary ring-offset-1 ring-offset-background'
                    )}
                    style={{
                      backgroundColor: c.value === '' ? 'transparent' : c.value,
                    }}
                    onClick={() => handleColorSelect(c.value)}
                  >
                    {c.value === '' && (
                      <RemoveFormatting className="size-3 text-muted-foreground" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {t(`editor.color.${c.name}`)}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ============================================================
// Link Insert Button
// ============================================================

function LinkInsertButton({ editor }: { editor: Editor }): React.JSX.Element {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')

  const handleInsert = (): void => {
    if (url.trim()) {
      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({ href: url.trim() })
        .run()
      setUrl('')
      setOpen(false)
    }
  }

  const handleRemove = (): void => {
    editor.chain().focus().unsetLink().run()
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                'size-7 rounded',
                editor.isActive('link') && 'bg-accent text-accent-foreground'
              )}
              tabIndex={-1}
            >
              <LinkIcon className="size-3.5" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {t('notes.insertLink')}
        </TooltipContent>
      </Tooltip>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">
            {t('notes.insertLink')}
          </div>
          <Input
            placeholder="https://..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleInsert()
            }}
            className="h-8 text-xs"
          />
          <div className="flex gap-2">
            <Button size="sm" className="h-7 text-xs flex-1" onClick={handleInsert}>
              {t('notes.insertUrl')}
            </Button>
            {editor.isActive('link') && (
              <Button
                size="sm"
                variant="destructive"
                className="h-7 text-xs"
                onClick={handleRemove}
              >
                {t('notes.removeLink')}
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
