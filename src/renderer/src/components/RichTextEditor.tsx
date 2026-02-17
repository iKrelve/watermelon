import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { useEffect, useRef, useCallback } from 'react'
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
} from 'lucide-react'

interface RichTextEditorProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string
  className?: string
  editable?: boolean
}

/**
 * Rich text editor based on TipTap.
 * Supports: bold, italic, strikethrough, bullet list, ordered list,
 * task list, blockquote, code block, horizontal rule.
 *
 * Content is stored as HTML.
 */
export function RichTextEditor({
  content,
  onChange,
  placeholder = '添加备注...',
  className,
  editable = true,
}: RichTextEditorProps): React.JSX.Element {
  const { t } = useTranslation()
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  // Track whether the latest content update came from the parent
  // (i.e. was a "reset") so we can suppress the onUpdate echo.
  const suppressNextUpdate = useRef(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Placeholder.configure({ placeholder }),
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content,
    editable,
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm dark:prose-invert max-w-none',
          'focus:outline-none min-h-[60px] px-3 py-2',
          'text-sm leading-relaxed',
          '[&_ul[data-type="taskList"]]:list-none [&_ul[data-type="taskList"]]:pl-0',
          '[&_ul[data-type="taskList"]_li]:flex [&_ul[data-type="taskList"]_li]:items-start [&_ul[data-type="taskList"]_li]:gap-2',
          '[&_ul[data-type="taskList"]_li_label]:mt-0.5',
          '[&_ul[data-type="taskList"]_li_div]:flex-1'
        ),
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

  // Sync external content changes (e.g. switching tasks)
  useEffect(() => {
    if (!editor) return
    const currentHTML = editor.getHTML()
    // Only reset when content actually differs (avoids cursor jumping)
    if (currentHTML !== content) {
      suppressNextUpdate.current = true
      editor.commands.setContent(content, false)
    }
  }, [editor, content])

  useEffect(() => {
    if (!editor) return
    editor.setEditable(editable)
  }, [editor, editable])

  const ToolbarButton = useCallback(
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
              'size-6 rounded',
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

  if (!editor) return <div className={cn('min-h-[60px]', className)} />

  return (
    <div
      className={cn(
        'rounded-md border border-muted/60 transition-colors',
        'focus-within:border-primary/30 focus-within:ring-1 focus-within:ring-primary/10',
        className
      )}
    >
      {/* Toolbar */}
      {editable && (
        <TooltipProvider delayDuration={400}>
          <div className="flex items-center gap-0.5 border-b border-border/40 px-1 py-0.5 flex-wrap">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive('bold')}
              icon={Bold}
              tooltip={t('editor.bold')}
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive('italic')}
              icon={Italic}
              tooltip={t('editor.italic')}
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleStrike().run()}
              isActive={editor.isActive('strike')}
              icon={Strikethrough}
              tooltip={t('editor.strikethrough')}
            />

            <div className="w-px h-4 bg-border/60 mx-0.5" />

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive('bulletList')}
              icon={List}
              tooltip={t('editor.bulletList')}
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              isActive={editor.isActive('orderedList')}
              icon={ListOrdered}
              tooltip={t('editor.orderedList')}
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleTaskList().run()}
              isActive={editor.isActive('taskList')}
              icon={ListChecks}
              tooltip={t('editor.taskList')}
            />

            <div className="w-px h-4 bg-border/60 mx-0.5" />

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              isActive={editor.isActive('blockquote')}
              icon={Quote}
              tooltip={t('editor.blockquote')}
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              isActive={editor.isActive('codeBlock')}
              icon={Code}
              tooltip={t('editor.codeBlock')}
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              icon={Minus}
              tooltip={t('editor.horizontalRule')}
            />

            <div className="ml-auto flex items-center gap-0.5">
              <ToolbarButton
                onClick={() => editor.chain().focus().undo().run()}
                icon={Undo}
                tooltip={t('editor.undo')}
              />
              <ToolbarButton
                onClick={() => editor.chain().focus().redo().run()}
                icon={Redo}
                tooltip={t('editor.redo')}
              />
            </div>
          </div>
        </TooltipProvider>
      )}

      {/* Editor */}
      <EditorContent editor={editor} />
    </div>
  )
}
