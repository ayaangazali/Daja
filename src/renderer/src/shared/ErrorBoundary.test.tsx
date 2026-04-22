import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ErrorBoundary } from './ErrorBoundary'

function Boom(): React.JSX.Element {
  throw new Error('kaboom')
}

function Ok(): React.JSX.Element {
  return <div>child rendered</div>
}

describe('ErrorBoundary', () => {
  it('passes children through when no error', () => {
    render(
      <ErrorBoundary>
        <Ok />
      </ErrorBoundary>
    )
    expect(screen.getByText('child rendered')).toBeTruthy()
  })
  it('catches thrown error and shows fallback', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    )
    expect(screen.getByText(/Something went wrong|crashed/i)).toBeTruthy()
    expect(screen.getByText(/kaboom/)).toBeTruthy()
    errorSpy.mockRestore()
  })
  it('uses provided label in fallback', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary label="TestZone">
        <Boom />
      </ErrorBoundary>
    )
    expect(screen.getByText(/TestZone crashed/)).toBeTruthy()
    errorSpy.mockRestore()
  })
  it('Retry button is rendered', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    )
    expect(screen.getByRole('button', { name: /retry/i })).toBeTruthy()
    errorSpy.mockRestore()
  })
})
