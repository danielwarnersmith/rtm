import { useEffect, useRef, useState } from 'react'

interface BboxCanvasProps {
  sourceUrl: string
  bbox: number[] | null
  onBboxChange: (bbox: number[]) => void
  onSelectionComplete?: (bbox: number[]) => void
}

type HandleType = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w' | 'move' | null

export default function BboxCanvas({ sourceUrl, bbox, onBboxChange, onSelectionComplete }: BboxCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const scaleRef = useRef(1)
  const [dragState, setDragState] = useState<{
    active: boolean
    handle: HandleType
    startX: number
    startY: number
    startBbox: number[]
  } | null>(null)
  const [selectionState, setSelectionState] = useState<{
    active: boolean
    startX: number
    startY: number
    currentX: number
    currentY: number
  } | null>(null)

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
        
        // Draw bbox if available (but hide it if Shift is held for new selection)
        if (bbox && bbox.length === 4 && !selectionState?.active) {
          console.log('[BboxCanvas] Drawing bbox:', bbox)
          drawBbox(ctx, bbox, scaleFactor)
        } else {
          console.log('[BboxCanvas] No bbox to draw:', bbox)
        }
        
        // Draw selection box if active
        if (selectionState?.active) {
          const selX = Math.min(selectionState.startX, selectionState.currentX)
          const selY = Math.min(selectionState.startY, selectionState.currentY)
          const selW = Math.abs(selectionState.currentX - selectionState.startX)
          const selH = Math.abs(selectionState.currentY - selectionState.startY)
          
          ctx.strokeStyle = '#10b981'
          ctx.lineWidth = 2
          ctx.setLineDash([5, 5])
          ctx.strokeRect(selX, selY, selW, selH)
          ctx.setLineDash([])
        }
      }
    }
  }, [image, bbox, selectionState])

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
    
    // Draw bbox rectangle
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 2
    ctx.setLineDash([5, 5])
    ctx.strokeRect(scaledX, scaledY, scaledW, scaledH)
    ctx.setLineDash([])
    
    // Draw drag handles
    const handleSize = 8
    const handleOffset = handleSize / 2
    
    ctx.fillStyle = '#3b82f6'
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    
    // Corner handles
    const corners = [
      { x: scaledX, y: scaledY, type: 'nw' },
      { x: scaledX + scaledW, y: scaledY, type: 'ne' },
      { x: scaledX, y: scaledY + scaledH, type: 'sw' },
      { x: scaledX + scaledW, y: scaledY + scaledH, type: 'se' },
    ]
    
    // Edge handles
    const edges = [
      { x: scaledX + scaledW / 2, y: scaledY, type: 'n' },
      { x: scaledX + scaledW / 2, y: scaledY + scaledH, type: 's' },
      { x: scaledX, y: scaledY + scaledH / 2, type: 'w' },
      { x: scaledX + scaledW, y: scaledY + scaledH / 2, type: 'e' },
    ]
    
    // Draw all handles
    ;[...corners, ...edges].forEach(({ x, y }) => {
      ctx.beginPath()
      ctx.arc(x, y, handleSize / 2, 0, 2 * Math.PI)
      ctx.fill()
      ctx.stroke()
    })
    
    // Draw center handle for moving
    const centerX = scaledX + scaledW / 2
    const centerY = scaledY + scaledH / 2
    ctx.beginPath()
    ctx.arc(centerX, centerY, handleSize / 2, 0, 2 * Math.PI)
    ctx.fillStyle = 'rgba(59, 130, 246, 0.5)'
    ctx.fill()
    ctx.stroke()
  }
  
  function getHandleAtPoint(canvasX: number, canvasY: number, bbox: number[], scale: number): HandleType {
    if (!bbox || bbox.length !== 4) return null
    
    const [x, y, w, h] = bbox
    const scaledX = x * scale
    const scaledY = y * scale
    const scaledW = w * scale
    const scaledH = h * scale
    
    const cornerThreshold = 8 // Hit area for corners
    const edgeThreshold = 10 // Larger hit area for edges to make them easier to grab
    
    // Check corners first (they have priority)
    if (Math.abs(canvasX - scaledX) < cornerThreshold && Math.abs(canvasY - scaledY) < cornerThreshold) return 'nw'
    if (Math.abs(canvasX - (scaledX + scaledW)) < cornerThreshold && Math.abs(canvasY - scaledY) < cornerThreshold) return 'ne'
    if (Math.abs(canvasX - scaledX) < cornerThreshold && Math.abs(canvasY - (scaledY + scaledH)) < cornerThreshold) return 'sw'
    if (Math.abs(canvasX - (scaledX + scaledW)) < cornerThreshold && Math.abs(canvasY - (scaledY + scaledH)) < cornerThreshold) return 'se'
    
    // Check edges - use distance from edge line, not just center point
    // North edge
    if (Math.abs(canvasY - scaledY) < edgeThreshold && 
        canvasX >= scaledX + cornerThreshold && canvasX <= scaledX + scaledW - cornerThreshold) {
      return 'n'
    }
    // South edge
    if (Math.abs(canvasY - (scaledY + scaledH)) < edgeThreshold && 
        canvasX >= scaledX + cornerThreshold && canvasX <= scaledX + scaledW - cornerThreshold) {
      return 's'
    }
    // West edge
    if (Math.abs(canvasX - scaledX) < edgeThreshold && 
        canvasY >= scaledY + cornerThreshold && canvasY <= scaledY + scaledH - cornerThreshold) {
      return 'w'
    }
    // East edge
    if (Math.abs(canvasX - (scaledX + scaledW)) < edgeThreshold && 
        canvasY >= scaledY + cornerThreshold && canvasY <= scaledY + scaledH - cornerThreshold) {
      return 'e'
    }
    
    // Check center (for moving)
    const centerX = scaledX + scaledW / 2
    const centerY = scaledY + scaledH / 2
    if (Math.abs(canvasX - centerX) < 8 && Math.abs(canvasY - centerY) < 8) return 'move'
    
    // Check if inside bbox (for moving)
    if (canvasX >= scaledX && canvasX <= scaledX + scaledW && 
        canvasY >= scaledY && canvasY <= scaledY + scaledH) {
      return 'move'
    }
    
    return null
  }
  
  function canvasToImageCoords(canvasX: number, canvasY: number, scale: number): [number, number] {
    return [canvasX / scale, canvasY / scale]
  }
  
  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!canvasRef.current || !image) return
    
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const canvasX = e.clientX - rect.left
    const canvasY = e.clientY - rect.top
    const scale = scaleRef.current
    
    // If Shift is held, always start a new selection (hide current bbox)
    if (e.shiftKey) {
      setSelectionState({
        active: true,
        startX: canvasX,
        startY: canvasY,
        currentX: canvasX,
        currentY: canvasY,
      })
      canvas.style.cursor = 'crosshair'
      return
    }
    
    // If there's a bbox, check if clicking on a handle
    if (bbox && bbox.length === 4) {
      const handle = getHandleAtPoint(canvasX, canvasY, bbox, scale)
      if (handle) {
        setDragState({
          active: true,
          handle,
          startX: canvasX,
          startY: canvasY,
          startBbox: [...bbox],
        })
        canvas.style.cursor = getCursorForHandle(handle)
        return
      }
    }
    
    // Otherwise, start a new selection (when no bbox exists)
    setSelectionState({
      active: true,
      startX: canvasX,
      startY: canvasY,
      currentX: canvasX,
      currentY: canvasY,
    })
    canvas.style.cursor = 'crosshair'
  }
  
  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!canvasRef.current || !image) return
    
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const canvasX = e.clientX - rect.left
    const canvasY = e.clientY - rect.top
    const scale = scaleRef.current
    
    // Handle selection drag
    if (selectionState?.active) {
      setSelectionState({
        ...selectionState,
        currentX: canvasX,
        currentY: canvasY,
      })
      return
    }
    
    // Handle bbox drag/resize
    if (!bbox || bbox.length !== 4) return
    
    if (dragState?.active) {
      // Calculate delta in image coordinates
      const deltaX = (canvasX - dragState.startX) / scale
      const deltaY = (canvasY - dragState.startY) / scale
      
      const [startX, startY, startW, startH] = dragState.startBbox
      let newX = startX
      let newY = startY
      let newW = startW
      let newH = startH
      
      const handle = dragState.handle
      
      if (handle === 'move') {
        // Move the entire bbox
        newX = startX + deltaX
        newY = startY + deltaY
      } else if (handle === 'nw') {
        // Resize from northwest corner
        newX = startX + deltaX
        newY = startY + deltaY
        newW = startW - deltaX
        newH = startH - deltaY
      } else if (handle === 'ne') {
        // Resize from northeast corner
        newY = startY + deltaY
        newW = startW + deltaX
        newH = startH - deltaY
      } else if (handle === 'sw') {
        // Resize from southwest corner
        newX = startX + deltaX
        newW = startW - deltaX
        newH = startH + deltaY
      } else if (handle === 'se') {
        // Resize from southeast corner
        newW = startW + deltaX
        newH = startH + deltaY
      } else if (handle === 'n') {
        // Resize from north edge
        newY = startY + deltaY
        newH = startH - deltaY
      } else if (handle === 's') {
        // Resize from south edge
        newH = startH + deltaY
      } else if (handle === 'w') {
        // Resize from west edge
        newX = startX + deltaX
        newW = startW - deltaX
      } else if (handle === 'e') {
        // Resize from east edge
        newW = startW + deltaX
      }
      
      // Ensure minimum size
      if (newW < 1) {
        newW = 1
        if (handle === 'nw' || handle === 'w') newX = startX + startW - 1
      }
      if (newH < 1) {
        newH = 1
        if (handle === 'nw' || handle === 'n') newY = startY + startH - 1
      }
      
      // Ensure bbox stays within image bounds
      const imageWidth = image?.naturalWidth || 0
      const imageHeight = image?.naturalHeight || 0
      
      if (newX < 0) {
        newW += newX
        newX = 0
      }
      if (newY < 0) {
        newH += newY
        newY = 0
      }
      if (newX + newW > imageWidth) {
        newW = imageWidth - newX
      }
      if (newY + newH > imageHeight) {
        newH = imageHeight - newY
      }
      
      // Ensure minimum size after bounds checking
      if (newW < 1) newW = 1
      if (newH < 1) newH = 1
      
      onBboxChange([Math.round(newX), Math.round(newY), Math.round(newW), Math.round(newH)])
    } else {
      // Update cursor based on hover
      const handle = getHandleAtPoint(canvasX, canvasY, bbox, scale)
      canvas.style.cursor = handle ? getCursorForHandle(handle) : 'default'
    }
  }
  
  function handleMouseUp() {
    const canvas = canvasRef.current
    if (!canvas) return
    
    // Handle selection completion
    if (selectionState?.active) {
      const scale = scaleRef.current
      const [startX, startY] = canvasToImageCoords(selectionState.startX, selectionState.startY, scale)
      const [endX, endY] = canvasToImageCoords(selectionState.currentX, selectionState.currentY, scale)
      
      const x = Math.min(startX, endX)
      const y = Math.min(startY, endY)
      const w = Math.abs(endX - startX)
      const h = Math.abs(endY - startY)
      
      // Only create selection if it has meaningful size (at least 10x10 pixels)
      if (w >= 10 && h >= 10) {
        const imageWidth = image?.naturalWidth || 0
        const imageHeight = image?.naturalHeight || 0
        
        // Ensure within bounds
        const finalX = Math.max(0, Math.min(x, imageWidth - 1))
        const finalY = Math.max(0, Math.min(y, imageHeight - 1))
        const finalW = Math.max(1, Math.min(w, imageWidth - finalX))
        const finalH = Math.max(1, Math.min(h, imageHeight - finalY))
        
        const newBbox = [Math.round(finalX), Math.round(finalY), Math.round(finalW), Math.round(finalH)]
        
        // Update bbox immediately
        onBboxChange(newBbox)
        
        // Trigger snapping/refinement
        if (onSelectionComplete) {
          onSelectionComplete(newBbox)
        }
      }
      
      canvas.style.cursor = 'default'
      setSelectionState(null)
      return
    }
    
    // Handle bbox drag completion
    if (dragState?.active) {
      canvas.style.cursor = 'default'
    }
    setDragState(null)
  }
  
  function getCursorForHandle(handle: HandleType): string {
    switch (handle) {
      case 'nw':
      case 'se':
        return 'nwse-resize'
      case 'ne':
      case 'sw':
        return 'nesw-resize'
      case 'n':
      case 's':
        return 'ns-resize'
      case 'e':
      case 'w':
        return 'ew-resize'
      case 'move':
        return 'move'
      default:
        return 'default'
    }
  }

  function nudgeBbox(dx: number, dy: number) {
    if (!bbox || bbox.length !== 4) return
    const [x, y, w, h] = bbox
    onBboxChange([x + dx, y + dy, w, h])
  }

  function resizeBbox(dw: number, dh: number) {
    if (!bbox || bbox.length !== 4) return
    const [x, y, w, h] = bbox
    // Ensure width and height stay positive
    const newW = Math.max(1, w + dw)
    const newH = Math.max(1, h + dh)
    onBboxChange([x, y, newW, newH])
  }

  return (
    <div className="flex flex-col gap-3">
      {!image && <div className="py-10 text-center text-neutral-500 dark:text-neutral-400">Loading image...</div>}
      <canvas 
        ref={canvasRef} 
        className="border border-neutral-200 dark:border-neutral-800 rounded max-w-full h-auto cursor-default"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        title="Click and drag to select area. Hold Shift to create new selection."
      />
      {bbox && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400 w-12">Position</span>
              <div className="flex gap-0.5">
                <button
                  onClick={() => nudgeBbox(-1, 0)}
                  className="w-5 h-5 border border-neutral-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-[10px] flex items-center justify-center"
                  title="Move left"
                >
                  ←
                </button>
                <button
                  onClick={() => nudgeBbox(0, -1)}
                  className="w-5 h-5 border border-neutral-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-[10px] flex items-center justify-center"
                  title="Move up"
                >
                  ↑
                </button>
                <button
                  onClick={() => nudgeBbox(0, 1)}
                  className="w-5 h-5 border border-neutral-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-[10px] flex items-center justify-center"
                  title="Move down"
                >
                  ↓
                </button>
                <button
                  onClick={() => nudgeBbox(1, 0)}
                  className="w-5 h-5 border border-neutral-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-[10px] flex items-center justify-center"
                  title="Move right"
                >
                  →
                </button>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Size</span>
              <div className="flex gap-0.5">
                <button
                  onClick={() => resizeBbox(-1, 0)}
                  className="w-5 h-5 border border-neutral-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-[10px] flex items-center justify-center"
                  title="Decrease width"
                >
                  W−
                </button>
                <button
                  onClick={() => resizeBbox(1, 0)}
                  className="w-5 h-5 border border-neutral-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-[10px] flex items-center justify-center"
                  title="Increase width"
                >
                  W+
                </button>
                <button
                  onClick={() => resizeBbox(0, -1)}
                  className="w-5 h-5 border border-neutral-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-[10px] flex items-center justify-center"
                  title="Decrease height"
                >
                  H−
                </button>
                <button
                  onClick={() => resizeBbox(0, 1)}
                  className="w-5 h-5 border border-neutral-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-[10px] flex items-center justify-center"
                  title="Increase height"
                >
                  H+
                </button>
              </div>
            </div>
            {bbox.length === 4 && (
              <div className="text-xs text-neutral-500 dark:text-neutral-500 font-mono ml-auto">
                {`[${bbox[0]}, ${bbox[1]}, ${bbox[2]}, ${bbox[3]}]`}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
