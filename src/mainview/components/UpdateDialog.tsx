import { useTranslation } from 'react-i18next'
import { Download, RefreshCw, Sparkles } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { UseAutoUpdateReturn } from '@/hooks/useAutoUpdate'

interface UpdateDialogProps {
  updater: UseAutoUpdateReturn
}

export function UpdateDialog({ updater }: UpdateDialogProps): React.JSX.Element {
  const { t } = useTranslation()
  const { available, update, downloading, progress, error, downloadAndInstall, dismiss } = updater

  return (
    <Dialog open={available} onOpenChange={(open) => !open && !downloading && dismiss()}>
      <DialogContent
        showCloseButton={!downloading}
        onPointerDownOutside={(e) => downloading && e.preventDefault()}
        onEscapeKeyDown={(e) => downloading && e.preventDefault()}
        className="sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            {t('updater.title')}
          </DialogTitle>
          <DialogDescription>
            {t('updater.description', { version: update?.version ?? '' })}
          </DialogDescription>
        </DialogHeader>

        {/* Release notes */}
        {update?.body && (
          <div className="max-h-40 overflow-y-auto rounded-md border bg-muted/50 p-3 text-sm text-muted-foreground">
            <p className="mb-1 font-medium text-foreground">{t('updater.releaseNotes')}</p>
            <p className="whitespace-pre-wrap">{update.body}</p>
          </div>
        )}

        {/* Progress bar */}
        {downloading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <RefreshCw className="size-3.5 animate-spin" />
                {progress < 100 ? t('updater.downloading') : t('updater.installing')}
              </span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className={cn(
                  'h-full rounded-full bg-primary transition-all duration-300 ease-out'
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <p className="text-sm text-destructive">{t('updater.error', { message: error })}</p>
        )}

        <DialogFooter>
          {!downloading && (
            <Button variant="outline" onClick={dismiss}>
              {t('updater.later')}
            </Button>
          )}
          <Button onClick={() => void downloadAndInstall()} disabled={downloading}>
            <Download className="mr-1.5 size-4" />
            {downloading ? t('updater.updating') : t('updater.install')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
