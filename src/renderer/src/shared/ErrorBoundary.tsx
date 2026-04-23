import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  label?: string
  /** Compact rendering for panel-level boundaries (no full-height centering). */
  compact?: boolean
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
      const { compact, label } = this.props
      if (compact) {
        return (
          <div className="rounded-md border border-[var(--color-neg)]/40 bg-[var(--color-neg)]/10 p-3 text-[11px]">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[var(--color-neg)]">
                <AlertTriangle className="h-3 w-3" />
                <span className="font-semibold">{label ?? 'Panel'} failed to render</span>
              </div>
              <button
                onClick={this.reset}
                className="flex items-center gap-1 rounded bg-[var(--color-info)] px-2 py-0.5 text-[10px] font-medium text-white"
              >
                <RefreshCw className="h-3 w-3" /> Retry
              </button>
            </div>
            <pre className="mt-1.5 max-h-20 overflow-auto whitespace-pre-wrap font-mono text-[10px] text-[var(--color-fg-muted)]">
              {this.state.error.message}
            </pre>
          </div>
        )
      }
      return (
        <div className="flex h-full items-center justify-center p-6">
          <div className="max-w-md rounded-md border border-[var(--color-neg)]/40 bg-[var(--color-neg)]/10 p-4">
            <div className="flex items-center gap-2 text-[var(--color-neg)]">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-semibold">
                {label ? `${label} crashed` : 'Something went wrong'}
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

/** Panel-level boundary — compact mode so one panel's crash doesn't replace the whole tab. */
export function PanelBoundary({
  label,
  children
}: {
  label: string
  children: ReactNode
}): React.JSX.Element {
  return (
    <ErrorBoundary label={label} compact>
      {children}
    </ErrorBoundary>
  )
}
