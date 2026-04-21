declare module 'react-grid-layout' {
  import type { ComponentType, ReactNode } from 'react'

  export interface LayoutItem {
    i: string
    x: number
    y: number
    w: number
    h: number
    minW?: number
    minH?: number
    maxW?: number
    maxH?: number
    static?: boolean
    isDraggable?: boolean
    isResizable?: boolean
  }

  export type Layout = LayoutItem[]
  export type Layouts = { [breakpoint: string]: Layout }

  export interface GridLayoutProps {
    className?: string
    layout?: Layout
    cols?: number
    rowHeight?: number
    width?: number
    margin?: [number, number]
    containerPadding?: [number, number]
    draggableHandle?: string
    draggableCancel?: string
    onLayoutChange?: (layout: Layout) => void
    children?: ReactNode
  }

  export interface ResponsiveProps {
    className?: string
    layouts?: Layouts
    breakpoints?: { [k: string]: number }
    cols?: { [k: string]: number }
    rowHeight?: number
    margin?: [number, number]
    containerPadding?: [number, number]
    draggableHandle?: string
    onLayoutChange?: (current: Layout, all: Layouts) => void
    children?: ReactNode
  }

  const GridLayout: ComponentType<GridLayoutProps>
  export default GridLayout
  export const Responsive: ComponentType<ResponsiveProps>
  export function WidthProvider<P>(Component: ComponentType<P>): ComponentType<P>
}

declare module 'react-grid-layout/css/styles.css'
declare module 'react-resizable/css/styles.css'
