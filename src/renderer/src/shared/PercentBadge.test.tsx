import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PercentBadge } from './PercentBadge'

describe('PercentBadge', () => {
  it('renders positive with + prefix', () => {
    render(<PercentBadge value={2.5} />)
    expect(screen.getByText(/\+2\.50%/)).toBeTruthy()
  })
  it('renders negative as-is', () => {
    render(<PercentBadge value={-3.14} />)
    expect(screen.getByText(/-3\.14%/)).toBeTruthy()
  })
  it('null shows em-dash', () => {
    const { container } = render(<PercentBadge value={null} />)
    expect(container.textContent).toContain('—')
  })
  it('undefined shows em-dash', () => {
    const { container } = render(<PercentBadge value={undefined} />)
    expect(container.textContent).toContain('—')
  })
  it('applies pos color class for positive', () => {
    const { container } = render(<PercentBadge value={5} />)
    expect(container.innerHTML).toContain('color-pos')
  })
  it('applies neg color class for negative', () => {
    const { container } = render(<PercentBadge value={-5} />)
    expect(container.innerHTML).toContain('color-neg')
  })
  it('zero uses muted class', () => {
    const { container } = render(<PercentBadge value={0} />)
    expect(container.innerHTML).toContain('fg-muted')
  })
  it('accepts extra className', () => {
    const { container } = render(<PercentBadge value={1} className="custom-cls" />)
    expect(container.innerHTML).toContain('custom-cls')
  })
})
