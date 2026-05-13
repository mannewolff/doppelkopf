import { useState, useEffect } from 'react'

export type Viewport = 'mobile' | 'tablet' | 'desktop'

/**
 * Hook for responsive breakpoint detection (Landscape-only)
 * Breakpoints based on width (all devices landscape):
 * - Mobile: 375-812px
 * - Tablet: 813-1024px
 * - Desktop: ≥1280px
 */
export function useViewport(): Viewport {
  const [viewport, setViewport] = useState<Viewport>('desktop')

  useEffect(() => {
    function handleResize() {
      const width = window.innerWidth

      if (width < 813) {
        setViewport('mobile')
      } else if (width < 1280) {
        setViewport('tablet')
      } else {
        setViewport('desktop')
      }
    }

    // Initial call
    handleResize()

    // Listen to resize events
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return viewport
}
