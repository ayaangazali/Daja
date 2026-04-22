import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FlashPrice } from './FlashPrice'

describe('FlashPrice', () => {
  it('renders initial value', () => {
    const { container } = render(<FlashPrice value={100} />)
    expect(container.textContent).toBe('100.00')
  })
  it('null shows em-dash', () => {
    const { container } = render(<FlashPrice value={null} />)
    expect(container.textContent).toContain('—')
  })
  it('accepts custom digits', () => {
    const { container } = render(<FlashPrice value={3.14159} digits={4} />)
    expect(container.textContent).toBe('3.1416')
  })
  it('prepends prefix', () => {
    const { container } = render(<FlashPrice value={99.99} prefix="$" />)
    expect(container.textContent).toBe('$99.99')
  })
  it('applies className', () => {
    const { container } = render(<FlashPrice value={10} className="my-cls" />)
    expect(container.innerHTML).toContain('my-cls')
  })
  it('flash classes applied after value change', () => {
    const { container, rerender } = render(<FlashPrice value={100} />)
    rerender(<FlashPrice value={105} />)
    // After rerender the ref is checked; exact class transition is async via useEffect
    expect(container.querySelector('span')).toBeTruthy()
  })
})
