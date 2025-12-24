import { useEffect, useRef, useState } from 'react'

interface BboxCanvasProps {
  sourceUrl: string
  bbox: number[] | null
  onBboxChange: (bbox: number[]) => void
}

export default function BboxCanvas({ sourceUrl, bbox, onBboxChange }: BboxCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const scaleRef = useRef(1)

  // Load image
  useEffect(() => {
    setImage(null)
    
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      setImage(img)
    }
    img.onerror = () => {
      console.error('Failed to load image:', sourceUrl)
    }
    img.src = sourceUrl
  }, [sourceUrl])

  // Set up canvas and draw whenever image or bbox changes
  useEffect(() => {
    if (image && canvasRef.current) {
      const canvas = canvasRef.current
      const maxWidth = 600
      // Use naturalWidth/naturalHeight for actual image pixel dimensions
      const imageWidth = image.naturalWidth || image.width
      const imageHeight = image.naturalHeight || image.height
      const scaleFactor = Math.min(maxWidth / imageWidth, 1)
      
      // Set canvas dimensions
      canvas.width = imageWidth * scaleFactor
      canvas.height = imageHeight * scaleFactor
      scaleRef.current = scaleFactor
      
      // Draw image and bbox
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
        
        // Draw bbox if available
        if (bbox && bbox.length === 4) {
          drawBbox(ctx, bbox, scaleFactor)
        }
      }
    }
  }, [image, bbox])

  function drawBbox(ctx: CanvasRenderingContext2D, bbox: number[] | null, scale: number) {
    if (!bbox || bbox.length !== 4) return

    // Bbox format is [x, y, width, height] in original image coordinates
    const [x, y, w, h] = bbox
    
    // Scale to canvas coordinates
    const scaledX = x * scale
    const scaledY = y * scale
    const scaledW = w * scale
    const scaledH = h * scale
    
    // Validate bbox is within canvas bounds
    if (scaledX < 0 || scaledY < 0 || 
        scaledX + scaledW > ctx.canvas.width || 
        scaledY + scaledH > ctx.canvas.height) {
      console.warn('Bbox extends outside image bounds', { bbox, scale, canvas: { width: ctx.canvas.width, height: ctx.canvas.height } })
    }
    
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 2
    ctx.setLineDash([5, 5])
    ctx.strokeRect(scaledX, scaledY, scaledW, scaledH)
    ctx.setLineDash([])
  }

  function nudgeBbox(dx: number, dy: number) {
    if (!bbox || bbox.length !== 4) return
    const [x, y, w, h] = bbox
    onBboxChange([x + dx, y + dy, w, h])
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {!image && <div className="py-10 text-center text-neutral-500 dark:text-neutral-400">Loading image...</div>}
      <canvas ref={canvasRef} className="border border-neutral-200 dark:border-neutral-800 rounded max-w-full h-auto" />
      {bbox && (
        <div className="flex gap-2">
          <button
            onClick={() => nudgeBbox(-1, 0)}
            className="w-8 h-8 border border-neutral-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          >
            ←
          </button>
          <button
            onClick={() => nudgeBbox(0, -1)}
            className="w-8 h-8 border border-neutral-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          >
            ↑
          </button>
          <button
            onClick={() => nudgeBbox(0, 1)}
            className="w-8 h-8 border border-neutral-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          >
            ↓
          </button>
          <button
            onClick={() => nudgeBbox(1, 0)}
            className="w-8 h-8 border border-neutral-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          >
            →
          </button>
        </div>
      )}
    </div>
  )
}
