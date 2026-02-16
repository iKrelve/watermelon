import { Component, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

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
            <h2 className="text-lg font-semibold mb-2">出了点问题</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {this.state.error?.message || '应用遇到了一个未知错误'}
            </p>
            <div className="flex justify-center gap-3">
              <Button onClick={this.handleRetry}>重试</Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                刷新页面
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
