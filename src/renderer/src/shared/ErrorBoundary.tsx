import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  label?: string
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('ErrorBoundary caught:', this.props.label, error, info.componentStack)
  }

  reset = (): void => {
    this.setState({ error: null })
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="flex h-full items-center justify-center p-6">
          <div className="max-w-md rounded-md border border-[var(--color-neg)]/40 bg-[var(--color-neg)]/10 p-4">
            <div className="flex items-center gap-2 text-[var(--color-neg)]">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-semibold">
                {this.props.label ? `${this.props.label} crashed` : 'Something went wrong'}
              </span>
            </div>
            <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap font-mono text-[10px] text-[var(--color-fg-muted)]">
              {this.state.error.message}
            </pre>
            <button
              onClick={this.reset}
              className="mt-3 flex items-center gap-1 rounded bg-[var(--color-info)] px-3 py-1 text-[11px] font-medium text-white"
            >
              <RefreshCw className="h-3 w-3" /> Retry
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
