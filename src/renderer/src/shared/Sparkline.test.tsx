import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Sparkline } from './Sparkline'

describe('Sparkline', () => {
  it('renders empty svg for < 2 points', () => {
    const { container } = render(<Sparkline points={[]} />)
    const svg = container.querySelector('svg')
    expect(svg).toBeTruthy()
    expect(svg!.querySelector('path')).toBeNull()
  })
  it('renders single path for multi-point series', () => {
    const { container } = render(<Sparkline points={[1, 2, 3, 4]} />)
    expect(container.querySelectorAll('path')).toHaveLength(1)
  })
  it('uses positive color for rising series', () => {
    const { container } = render(<Sparkline points={[1, 5]} />)
    const stroke = container.querySelector('path')?.getAttribute('stroke')
    expect(stroke).toContain('pos')
  })
  it('uses negative color for falling series', () => {
    const { container } = render(<Sparkline points={[5, 1]} />)
    const stroke = container.querySelector('path')?.getAttribute('stroke')
    expect(stroke).toContain('neg')
  })
  it('custom stroke overrides auto color', () => {
    const { container } = render(<Sparkline points={[1, 2]} stroke="#abcdef" />)
    expect(container.querySelector('path')?.getAttribute('stroke')).toBe('#abcdef')
  })
  it('respects width/height', () => {
    const { container } = render(<Sparkline points={[1, 2]} width={200} height={50} />)
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('width')).toBe('200')
    expect(svg.getAttribute('height')).toBe('50')
  })
  it('className passed through', () => {
    const { container } = render(<Sparkline points={[1, 2]} className="spark-test" />)
    expect(container.querySelector('svg')?.className.baseVal).toContain('spark-test')
  })
})
