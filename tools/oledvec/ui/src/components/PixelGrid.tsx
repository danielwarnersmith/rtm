import { useEffect, useRef, useState } from 'react'

interface PixelGridProps {
  previewUrl: string | null
  overrides: {
    force_on: [number, number][]
    force_off: [number, number][]
  }
  onPixelToggle: (x: number, y: number, isOn: boolean) => void
}

export default function PixelGrid({ previewUrl, overrides, onPixelToggle }: PixelGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [bitmap, setBitmap] = useState<boolean[][]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [dragValue, setDragValue] = useState<boolean | null>(null)
  const [hoveredPixel, setHoveredPixel] = useState<[number, number] | null>(null)

  // Redraw function that uses current bitmap and hover state
  const redrawCanvas = (ctx: CanvasRenderingContext2D, bmp: boolean[][], hover: [number, number] | null, dragging: boolean) => {
    const imageData = ctx.createImageData(128, 64)
    
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 128; x++) {
        const idx = (y * 128 + x) * 4
        const value = bmp[y]?.[x] ? 0 : 255
        imageData.data[idx] = value
        imageData.data[idx + 1] = value
        imageData.data[idx + 2] = value
        imageData.data[idx + 3] = 255
      }
    }
    
    ctx.putImageData(imageData, 0, 0)

    // Draw hover highlight - show what the pixel will look like when toggled
    if (hover) {
      const [x, y] = hover
      
      // Determine cursor color state
      let guideColor: string
      let fillColor: string
      let strokeColor: string
      
      // Check if we're over a dark pixel (for better crosshair contrast)
      const currentPixelValue = bmp[y]?.[x] ?? false
      const isOverDarkPixel = currentPixelValue // dark pixel = true (black)
      
      if (dragging) {
        // Purple when actively drawing
        guideColor = isOverDarkPixel 
          ? 'rgba(168, 85, 247, 0.4)' // higher opacity over dark pixels
          : 'rgba(168, 85, 247, 0.2)' // purple-500 with low opacity for guides
        fillColor = 'rgba(168, 85, 247, 0.8)' // purple-500 with transparency
        strokeColor = 'rgb(168, 85, 247)'
      } else {
        // Canvas is already at logical size (128x64), so each pixel is exactly 1x1
        // Get current pixel value to determine if we're adding or removing
        const isAdding = !currentPixelValue // Will turn on (add pixel)
        
        // Green if adding, red if removing
        if (isAdding) {
          guideColor = isOverDarkPixel
            ? 'rgba(34, 197, 94, 0.4)' // higher opacity over dark pixels
            : 'rgba(34, 197, 94, 0.2)' // green-500 with low opacity for guides
          fillColor = 'rgba(34, 197, 94, 0.8)' // green-500 with transparency
          strokeColor = 'rgb(34, 197, 94)'
        } else {
          guideColor = isOverDarkPixel
            ? 'rgba(239, 68, 68, 0.4)' // higher opacity over dark pixels
            : 'rgba(239, 68, 68, 0.2)' // red-500 with low opacity for guides
          fillColor = 'rgba(239, 68, 68, 0.8)' // red-500 with transparency
          strokeColor = 'rgb(239, 68, 68)'
        }
      }
      
      // Draw alignment guides (crosshairs) with matching color
      // First draw a subtle white outline for better contrast over dark pixels
      if (isOverDarkPixel) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
        ctx.lineWidth = 1.5
        
        // Vertical guide line outline
        ctx.beginPath()
        ctx.moveTo(x + 0.5, 0)
        ctx.lineTo(x + 0.5, 64)
        ctx.stroke()
        
        // Horizontal guide line outline
        ctx.beginPath()
        ctx.moveTo(0, y + 0.5)
        ctx.lineTo(128, y + 0.5)
        ctx.stroke()
      }
      
      // Draw the main crosshair lines
      ctx.strokeStyle = guideColor
      ctx.lineWidth = 0.5
      
      // Vertical guide line (full height)
      ctx.beginPath()
      ctx.moveTo(x + 0.5, 0)
      ctx.lineTo(x + 0.5, 64)
      ctx.stroke()
      
      // Horizontal guide line (full width)
      ctx.beginPath()
      ctx.moveTo(0, y + 0.5)
      ctx.lineTo(128, y + 0.5)
      ctx.stroke()
      
      // Draw the pixel preview
      ctx.fillStyle = fillColor
      ctx.fillRect(x, y, 1, 1)
      
      // Draw border in matching color
      ctx.strokeStyle = strokeColor
      ctx.lineWidth = 0.5
      ctx.strokeRect(x, y, 1, 1)
    }
  }

  useEffect(() => {
    console.log('PixelGrid: previewUrl changed:', previewUrl, 'type:', typeof previewUrl, 'is null:', previewUrl === null, 'is undefined:', previewUrl === undefined, 'is empty string:', previewUrl === '')
    if (!previewUrl || !canvasRef.current) {
      if (!previewUrl) {
        console.log('PixelGrid: No previewUrl provided (value:', previewUrl, ')')
      }
      return
    }

    console.log('PixelGrid: Loading preview from', previewUrl)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onerror = (err) => {
      console.error('PixelGrid: Failed to load preview image:', previewUrl, err)
    }
    img.onload = () => {
      console.log('PixelGrid: Preview image loaded successfully')
      const canvas = canvasRef.current!
      canvas.width = 128
      canvas.height = 64
      
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.drawImage(img, 0, 0, 128, 64)
      const imageData = ctx.getImageData(0, 0, 128, 64)
      
      // Convert to boolean bitmap
      const newBitmap: boolean[][] = []
      for (let y = 0; y < 64; y++) {
        newBitmap[y] = []
        for (let x = 0; x < 128; x++) {
          const idx = (y * 128 + x) * 4
          const r = imageData.data[idx]
          newBitmap[y][x] = r > 127
        }
      }

      // Apply overrides
      for (const [x, y] of overrides.force_on) {
        if (y >= 0 && y < 64 && x >= 0 && x < 128) {
          newBitmap[y][x] = true
        }
      }
      for (const [x, y] of overrides.force_off) {
        if (y >= 0 && y < 64 && x >= 0 && x < 128) {
          newBitmap[y][x] = false
        }
      }

      setBitmap(newBitmap)
    }
    img.src = previewUrl
  }, [previewUrl, overrides])

  // Redraw when hovered pixel, bitmap, or dragging state changes
  useEffect(() => {
    if (canvasRef.current && bitmap.length > 0) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (ctx) {
        redrawCanvas(ctx, bitmap, hoveredPixel, isDragging)
      }
    }
  }, [hoveredPixel, bitmap, isDragging])


  function getPixelFromEvent(e: React.MouseEvent<HTMLCanvasElement>): [number, number] | null {
    const canvas = canvasRef.current
    if (!canvas) return null

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    
    const x = Math.floor((e.clientX - rect.left) * scaleX)
    const y = Math.floor((e.clientY - rect.top) * scaleY)
    
    if (x < 0 || x >= 128 || y < 0 || y >= 64) return null
    
    return [x, y]
  }

  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    const pixel = getPixelFromEvent(e)
    if (!pixel) return

    const [x, y] = pixel
    const currentValue = bitmap[y]?.[x] ?? false
    const newValue = !currentValue

    setIsDragging(true)
    setDragValue(newValue)
    onPixelToggle(x, y, newValue)
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const pixel = getPixelFromEvent(e)
    setHoveredPixel(pixel)

    if (!isDragging || dragValue === null) return
    if (!pixel) return

    const [x, y] = pixel
    const currentValue = bitmap[y]?.[x] ?? false
    
    if (currentValue !== dragValue) {
      onPixelToggle(x, y, dragValue)
    }
  }

  function handleMouseUp() {
    setIsDragging(false)
    setDragValue(null)
  }

  function handleMouseLeave() {
    setHoveredPixel(null)
    setIsDragging(false)
    setDragValue(null)
  }

  if (!previewUrl) {
    return <div className="py-10 text-center text-neutral-500 dark:text-neutral-400">No preview available</div>
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <canvas
        ref={canvasRef}
        className="border border-neutral-200 dark:border-neutral-700 rounded w-full max-w-[512px] h-auto bg-white dark:bg-neutral-950"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{ imageRendering: 'pixelated', cursor: 'none' }}
      />
      <div className="w-full max-w-[512px]">
        <div className="text-xs text-neutral-500 dark:text-neutral-500 font-mono">
          Click and drag to toggle pixels. Grid: 128×64
        </div>
      </div>
    </div>
  )
}
