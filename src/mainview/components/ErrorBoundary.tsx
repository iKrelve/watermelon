import { Component, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import i18n from '@/i18n'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * React Error Boundary to catch unexpected rendering errors.
 * Provides a fallback UI with a retry option.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen items-center justify-center bg-background">
          <div className="text-center max-w-md px-6">
            <p className="text-4xl mb-4">😵</p>
            <h2 className="text-lg font-semibold mb-2">{i18n.t('error.title')}</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {this.state.error?.message || i18n.t('error.unknownMessage')}
            </p>
            <div className="flex justify-center gap-3">
              <Button onClick={this.handleRetry}>{i18n.t('error.retry')}</Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                {i18n.t('error.reload')}
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
