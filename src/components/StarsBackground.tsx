import { useRef, useEffect, memo } from 'react'

interface StarsBackgroundProps {
  starCount?: number
}

export const StarsBackground = memo(function StarsBackground({
  starCount = 300,
}: StarsBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1

    const resize = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      draw(w, h)
    }

    // Generate stable star positions on first draw
    const stars: { x: number; y: number; r: number; opacity: number }[] = []
    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random(),
        y: Math.random(),
        r: Math.random() * 1.4 + 0.3,
        opacity: Math.random() * 0.7 + 0.3,
      })
    }

    function draw(w: number, h: number) {
      if (!ctx) return
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, w, h)

      for (const star of stars) {
        ctx.beginPath()
        ctx.arc(star.x * w, star.y * h, star.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`
        ctx.fill()
      }
    }

    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [starCount])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  )
})
