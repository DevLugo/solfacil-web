'use client'

import * as React from 'react'

interface UseScrollableOptions {
  /**
   * Whether to prevent the default behavior (page scroll)
   * @default true
   */
  preventDefault?: boolean
  /**
   * Whether to stop event propagation
   * @default true
   */
  stopPropagation?: boolean
  /**
   * Whether to handle horizontal scroll
   * @default false
   */
  horizontal?: boolean
}

/**
 * Hook to handle wheel events for scrollable containers inside popovers/modals.
 * Fixes trackpad/mouse scroll issues where events propagate to the page instead
 * of scrolling the container.
 *
 * @example
 * ```tsx
 * const { ref, onWheel } = useScrollable()
 * return <div ref={ref} onWheel={onWheel} className="overflow-y-auto max-h-[300px]">...</div>
 * ```
 *
 * @example Using with currentTarget (no ref needed)
 * ```tsx
 * const { onWheel } = useScrollable()
 * return <div onWheel={onWheel} className="overflow-y-auto max-h-[300px]">...</div>
 * ```
 */
export function useScrollable<T extends HTMLElement = HTMLDivElement>(
  options: UseScrollableOptions = {}
) {
  const {
    preventDefault = true,
    stopPropagation = true,
    horizontal = false,
  } = options

  const ref = React.useRef<T>(null)

  const onWheel = React.useCallback(
    (e: React.WheelEvent<T>) => {
      // Use currentTarget (the element the handler is attached to) or the ref
      const target = e.currentTarget || ref.current
      if (!target) return

      if (preventDefault) {
        e.preventDefault()
      }
      if (stopPropagation) {
        e.stopPropagation()
      }

      // Manually scroll the element
      target.scrollTop += e.deltaY
      if (horizontal) {
        target.scrollLeft += e.deltaX
      }
    },
    [preventDefault, stopPropagation, horizontal]
  )

  return { ref, onWheel }
}

/**
 * Creates a wheel event handler for scrollable containers.
 * Use this when you don't need a ref and just want the handler.
 *
 * @example
 * ```tsx
 * <div onWheel={createScrollableHandler()} className="overflow-y-auto max-h-[300px]">...</div>
 * ```
 */
export function createScrollableHandler<T extends HTMLElement = HTMLDivElement>(
  options: UseScrollableOptions = {}
): React.WheelEventHandler<T> {
  const {
    preventDefault = true,
    stopPropagation = true,
    horizontal = false,
  } = options

  return (e: React.WheelEvent<T>) => {
    const target = e.currentTarget
    if (!target) return

    if (preventDefault) {
      e.preventDefault()
    }
    if (stopPropagation) {
      e.stopPropagation()
    }

    target.scrollTop += e.deltaY
    if (horizontal) {
      target.scrollLeft += e.deltaX
    }
  }
}
