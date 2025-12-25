import { useState, useEffect, useCallback } from 'react'
import { getItem, updateItemState, rerunItem, type ItemResponse, type ItemStateUpdate, type Item } from '../api'
import BboxCanvas from './BboxCanvas'
import PixelGrid from './PixelGrid'
import SVGPreview from './SVGPreview'

interface EditorProps {
  itemId: string
  onRerun: () => void
  items?: Item[]
  onStatusChange?: (itemId: string, newStatus: Item['status'], previousStatus?: Item['status']) => void | Promise<void>
}

export default function Editor({ itemId, onRerun, items, onStatusChange }: EditorProps) {
  const [item, setItem] = useState<ItemResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [threshold, setThreshold] = useState<number | null>(null)
  const [useAutoThreshold, setUseAutoThreshold] = useState(true)
  const [statusContextMenu, setStatusContextMenu] = useState<{ x: number; y: number } | null>(null)

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = () => {
      setStatusContextMenu(null)
    }
    if (statusContextMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [statusContextMenu])
  
  // Undo/redo history for pixel overrides
  const [overrideHistory, setOverrideHistory] = useState<Array<{
    force_on: [number, number][]
    force_off: [number, number][]
  }>>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  useEffect(() => {
    loadItem()
  }, [itemId])

  // Initialize history when item loads
  useEffect(() => {
    if (item) {
      const initialOverrides = {
        force_on: [...item.state.overrides.force_on],
        force_off: [...item.state.overrides.force_off],
      }
      setOverrideHistory([initialOverrides])
      setHistoryIndex(0)
    }
  }, [item?.id])


  async function loadItem() {
    try {
      setLoading(true)
      setError(null)
      const itemData = await getItem(itemId)
      setItem(itemData)
      const otsuThreshold = itemData.state.normalize_params?.otsu_threshold
      if (otsuThreshold !== undefined) {
        setThreshold(otsuThreshold)
        setUseAutoThreshold(false)
      } else {
        setUseAutoThreshold(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load item')
    } finally {
      setLoading(false)
    }
  }

  const saveCurrentState = useCallback(async () => {
    if (!item) return

    const update: ItemStateUpdate = {
      oled_bbox: item.state.oled_bbox ?? undefined,
      // If Auto is selected, don't send threshold (server will preserve existing or use auto)
      // If Manual is selected, send the threshold value
      threshold: useAutoThreshold ? undefined : threshold ?? undefined,
      notes: item.state.notes,
      flags: item.state.flags,
      overrides: {
        force_on: item.state.overrides.force_on,
        force_off: item.state.overrides.force_off,
      },
    }

    await updateItemState(itemId, update)
  }, [item, itemId, useAutoThreshold, threshold])

  const handleSave = useCallback(async () => {
    if (!item) return

    setSaving(true)
    try {
      await saveCurrentState()
      // Reload to get updated state, but preserve useAutoThreshold if it was set
      const wasAuto = useAutoThreshold
      await loadItem()
      // Restore Auto state if it was selected before save
      if (wasAuto) {
        setUseAutoThreshold(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }, [item, useAutoThreshold, saveCurrentState, loadItem])

  const handleSelectionComplete = useCallback(async (selectedBbox: number[]) => {
    // When user finishes selecting an area, trigger snapping to crop whitespace
    if (!item) return
    
    setSaving(true)
    try {
      // Update bbox first
      await updateItemState(itemId, { oled_bbox: selectedBbox })
      // Then rerun to apply snapping (refine_bbox=true)
      const result = await rerunItem(itemId, true)
      
      // Update item with the new bbox
      setItem((prevItem) => {
        if (!prevItem) return prevItem
        return {
          ...prevItem,
          state: result.state,
        }
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to snap bbox')
    } finally {
      setSaving(false)
    }
  }, [item, itemId])

  const handleRerun = useCallback(async (forceRedetect: boolean = false) => {
    if (!item) return

    setSaving(true)
    try {
      // If forcing re-detection, clear bbox first and reload to ensure state is updated
      if (forceRedetect) {
        await updateItemState(itemId, { oled_bbox: undefined })
        // Reload item to get updated state with cleared bbox
        await loadItem()
      } else {
        // Auto-save current edits before reprocessing
        await saveCurrentState()
      }
      // Reprocess with the saved state (or with cleared bbox for re-detection)
      const result = await rerunItem(itemId)
      
      // Update item with the new preview_url, svg_url, and state from rerun
      // This ensures the pixel grid gets the preview_url immediately
      const wasAuto = useAutoThreshold
      setItem((prevItem) => {
        if (!prevItem) {
          return prevItem
        }
        return {
          ...prevItem,
          preview_url: result.preview_url,
          svg_url: result.svg_url,
          state: result.state,
        }
      })
      // Update threshold state, but preserve Auto selection if it was selected
      const otsuThreshold = result.state.normalize_params?.otsu_threshold
      if (wasAuto) {
        // If Auto was selected, keep it selected (threshold will be auto-computed)
        setUseAutoThreshold(true)
        // Still set the threshold value for display, but it will be recomputed on next rerun
        if (otsuThreshold !== undefined) {
          setThreshold(otsuThreshold)
        }
      } else {
        // If Manual was selected, use the threshold from the result
        if (otsuThreshold !== undefined) {
          setThreshold(otsuThreshold)
          setUseAutoThreshold(false)
        } else {
          setUseAutoThreshold(true)
        }
      }
      
      // Reload sidebar to reflect status changes
      onRerun()
    } catch (err) {
      console.error('Rerun error:', err)
      setError(err instanceof Error ? err.message : 'Failed to rerun')
    } finally {
      setSaving(false)
    }
  }, [item, itemId, useAutoThreshold, saveCurrentState, onRerun])

  const handleBboxChange = useCallback((bbox: number[]) => {
    setItem((currentItem) => {
      if (!currentItem) return currentItem
      // Create a new array to ensure React detects the change
      const newBbox = [...bbox]
      return {
        ...currentItem,
        state: {
          ...currentItem.state,
          oled_bbox: newBbox,
        },
      }
    })
  }, [])

  // Handle keyboard shortcuts (must be after function definitions)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Only handle shortcuts when the editor is active (prevent interfering with other inputs)
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return // Don't handle shortcuts when typing in inputs
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const modKey = isMac ? e.metaKey : e.ctrlKey

      // Arrow keys for bbox movement (without modifier)
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && !modKey && !e.altKey) {
        if (item && item.state.oled_bbox && item.state.oled_bbox.length === 4) {
          e.preventDefault()
          const step = e.shiftKey ? 10 : 1
          const [x, y, w, h] = item.state.oled_bbox
          let newBbox: number[]
          
          switch (e.key) {
            case 'ArrowUp':
              newBbox = [x, y - step, w, h]
              break
            case 'ArrowDown':
              newBbox = [x, y + step, w, h]
              break
            case 'ArrowLeft':
              newBbox = [x - step, y, w, h]
              break
            case 'ArrowRight':
              newBbox = [x + step, y, w, h]
              break
            default:
              return
          }
          handleBboxChange(newBbox)
        }
        return
      }

      // Cmd+Arrow keys for bbox resizing (width/height)
      if (modKey && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && !e.altKey) {
        if (item && item.state.oled_bbox && item.state.oled_bbox.length === 4) {
          e.preventDefault()
          const step = e.shiftKey ? 10 : 1
          const [x, y, w, h] = item.state.oled_bbox
          let newBbox: number[]
          
          switch (e.key) {
            case 'ArrowUp':
              // Decrease height
              newBbox = [x, y, w, Math.max(1, h - step)]
              break
            case 'ArrowDown':
              // Increase height
              newBbox = [x, y, w, h + step]
              break
            case 'ArrowLeft':
              // Decrease width
              newBbox = [x, y, Math.max(1, w - step), h]
              break
            case 'ArrowRight':
              // Increase width
              newBbox = [x, y, w + step, h]
              break
            default:
              return
          }
          handleBboxChange(newBbox)
        }
        return
      }

      // Cmd+Enter for re-run, Shift+Cmd+Enter for save
      if (modKey && e.key === 'Enter') {
        e.preventDefault()
        if (e.shiftKey) {
          handleSave()
        } else {
          handleRerun()
        }
        return
      }

      // Check for Cmd+Z (Mac) or Ctrl+Z (Windows/Linux)
      const isUndo = modKey && e.key === 'z' && !e.shiftKey
      const isRedo = modKey && (e.key === 'z' && e.shiftKey || e.key === 'y')

      if (isUndo && historyIndex > 0 && item) {
        e.preventDefault()
        const previousOverrides = overrideHistory[historyIndex - 1]
        if (previousOverrides) {
          setItem({
            ...item,
            state: {
              ...item.state,
              overrides: {
                force_on: [...previousOverrides.force_on],
                force_off: [...previousOverrides.force_off],
              },
            },
          })
          setHistoryIndex(historyIndex - 1)
        }
      } else if (isRedo && historyIndex < overrideHistory.length - 1 && item) {
        e.preventDefault()
        const nextOverrides = overrideHistory[historyIndex + 1]
        if (nextOverrides) {
          setItem({
            ...item,
            state: {
              ...item.state,
              overrides: {
                force_on: [...nextOverrides.force_on],
                force_off: [...nextOverrides.force_off],
              },
            },
          })
          setHistoryIndex(historyIndex + 1)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [historyIndex, overrideHistory, item, handleBboxChange, handleSave, handleRerun])

  function handlePixelToggle(x: number, y: number, isOn: boolean) {
    if (!item) return

    const overrides = { ...item.state.overrides }
    const forceOn = [...overrides.force_on]
    const forceOff = [...overrides.force_off]

    // Remove from both lists
    const onIndex = forceOn.findIndex(([px, py]) => px === x && py === y)
    const offIndex = forceOff.findIndex(([px, py]) => px === x && py === y)

    if (onIndex >= 0) forceOn.splice(onIndex, 1)
    if (offIndex >= 0) forceOff.splice(offIndex, 1)

    // Add to appropriate list
    if (isOn) {
      forceOn.push([x, y])
    } else {
      forceOff.push([x, y])
    }

    const newOverrides = {
      force_on: forceOn,
      force_off: forceOff,
    }

    // Update history: remove any future states if we're not at the end, then add new state
    const newHistory = overrideHistory.slice(0, historyIndex + 1)
    newHistory.push({
      force_on: [...forceOn],
      force_off: [...forceOff],
    })
    
    // Limit history to 50 states to prevent memory issues
    const maxHistory = 50
    if (newHistory.length > maxHistory) {
      newHistory.shift() // Remove oldest state
    }
    
    setHistoryIndex(newHistory.length - 1)
    setOverrideHistory(newHistory)

    setItem({
      ...item,
      state: {
        ...item.state,
        overrides: newOverrides,
      },
    })
  }

  function handleNotesChange(notes: string) {
    if (!item) return
    setItem({
      ...item,
      state: {
        ...item.state,
        notes,
      },
    })
  }

  if (loading) {
    return <div className="p-6 text-center">Loading...</div>
  }

  if (error) {
    return <div className="p-6 text-center text-red-600 dark:text-red-400">Error: {error}</div>
  }

  if (!item) {
    return <div className="p-6 text-center text-red-600 dark:text-red-400">Item not found</div>
  }

  return (
    <div className="flex flex-col h-full overflow-auto relative">
      <style>{`
        input[type="range"].slider {
          -webkit-appearance: none !important;
          appearance: none !important;
          background: transparent !important;
          cursor: pointer;
          width: 100%;
          height: 8px;
        }
        input[type="range"].slider::-webkit-slider-runnable-track {
          width: 100%;
          height: 8px !important;
          background: #e5e7eb !important;
          border-radius: 4px;
        }
        .dark input[type="range"].slider::-webkit-slider-runnable-track {
          background: #374151 !important;
        }
        input[type="range"].slider::-webkit-slider-thumb {
          -webkit-appearance: none !important;
          appearance: none !important;
          background: #2563eb !important;
          height: 20px !important;
          width: 20px !important;
          border-radius: 50%;
          margin-top: -6px;
          border: 2px solid #ffffff !important;
          cursor: pointer;
        }
        .dark input[type="range"].slider::-webkit-slider-thumb {
          background: #3b82f6 !important;
          border-color: #1f2937 !important;
        }
        input[type="range"].slider::-moz-range-track {
          width: 100%;
          height: 8px !important;
          background: #e5e7eb !important;
          border-radius: 4px;
          border: none;
        }
        .dark input[type="range"].slider::-moz-range-track {
          background: #374151 !important;
        }
        input[type="range"].slider::-moz-range-thumb {
          background: #2563eb !important;
          height: 20px !important;
          width: 20px !important;
          border: 2px solid #ffffff !important;
          border-radius: 50%;
          cursor: pointer;
        }
        .dark input[type="range"].slider::-moz-range-thumb {
          background: #3b82f6 !important;
          border-color: #1f2937 !important;
        }
        input[type="range"].slider:focus {
          outline: none;
        }
      `}</style>
      {item && (
        <div className="absolute top-4 right-4 z-10">
          {(() => {
            const currentItem = items?.find(i => i.id === itemId)
            if (!currentItem) return null
            
            const status = currentItem.status
            const badgeClasses = {
              ok: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
              needs_review: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
              rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
            }
            const labels = {
              ok: 'OK',
              needs_review: 'Review',
              rejected: 'Rejected',
            }
            return (
              <div
                onContextMenu={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  const rect = e.currentTarget.getBoundingClientRect()
                  const menuWidth = 120 // min-w-[120px]
                  const menuHeight = 120 // approximate height
                  // Position menu to the left of the badge, aligned to the right edge
                  let x = rect.right - menuWidth
                  let y = rect.bottom + 4
                  // Adjust if would go offscreen
                  if (x < 0) x = rect.left
                  if (y + menuHeight > window.innerHeight) y = rect.top - menuHeight
                  setStatusContextMenu({ x, y })
                }}
                className="cursor-pointer"
                title="Right-click to change status"
              >
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase ${badgeClasses[status]}`}>
                  {labels[status]}
                </span>
              </div>
            )
          })()}
        </div>
      )}
      {statusContextMenu && (
        <div
          className="fixed bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg z-50 py-1 min-w-[120px]"
          style={{ left: `${statusContextMenu.x}px`, top: `${statusContextMenu.y}px` }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={async () => {
              setStatusContextMenu(null)
              if (!items) return
              const currentItem = items.find(i => i.id === itemId)
              if (!currentItem) return
              const previousStatus = currentItem.status
              try {
                await updateItemState(itemId, { manual_status: 'ok' })
                if (onStatusChange) {
                  const result = onStatusChange(itemId, 'ok', previousStatus)
                  if (result instanceof Promise) {
                    await result
                  }
                }
              } catch (err) {
                console.error('Failed to update status:', err)
                alert(`Failed to update status: ${err instanceof Error ? err.message : 'Unknown error'}`)
              }
            }}
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center gap-2"
          >
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            OK
          </button>
          <button
            onClick={async () => {
              setStatusContextMenu(null)
              if (!items) return
              const currentItem = items.find(i => i.id === itemId)
              if (!currentItem) return
              const previousStatus = currentItem.status
              try {
                await updateItemState(itemId, { manual_status: 'needs_review' })
                if (onStatusChange) {
                  const result = onStatusChange(itemId, 'needs_review', previousStatus)
                  if (result instanceof Promise) {
                    await result
                  }
                }
              } catch (err) {
                console.error('Failed to update status:', err)
                alert(`Failed to update status: ${err instanceof Error ? err.message : 'Unknown error'}`)
              }
            }}
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center gap-2"
          >
            <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
            Review
          </button>
          <button
            onClick={async () => {
              setStatusContextMenu(null)
              if (!items) return
              const currentItem = items.find(i => i.id === itemId)
              if (!currentItem) return
              const previousStatus = currentItem.status
              try {
                await updateItemState(itemId, { manual_status: 'rejected' })
                if (onStatusChange) {
                  const result = onStatusChange(itemId, 'rejected', previousStatus)
                  if (result instanceof Promise) {
                    await result
                  }
                }
              } catch (err) {
                console.error('Failed to update status:', err)
                alert(`Failed to update status: ${err instanceof Error ? err.message : 'Unknown error'}`)
              }
            }}
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center gap-2"
          >
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            Rejected
          </button>
        </div>
      )}
      <div className="flex-1 p-6 flex flex-col overflow-y-auto pb-20">
        <div className="pb-2">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Threshold</h3>
            <label className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                checked={useAutoThreshold}
                onChange={(e) => setUseAutoThreshold(e.target.checked)}
                className="rounded"
              />
              Auto (Otsu)
            </label>
            {!useAutoThreshold && (
              <>
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={threshold ?? 127}
                  onChange={(e) => setThreshold(parseInt(e.target.value))}
                  className="slider"
                  style={{ width: '200px' }}
                />
                {threshold !== null && (
                  <span className="font-mono text-sm text-neutral-500 dark:text-neutral-400">{threshold}</span>
                )}
              </>
            )}
          </div>
        </div>

        <div className="pt-2 pb-4">
          <div className="flex gap-6">
            <div className="flex-1">
              <h3 className="text-sm font-semibold mb-2 text-neutral-700 dark:text-neutral-300">Original Image</h3>
              <BboxCanvas
                sourceUrl={item.source_url}
                bbox={item.state.oled_bbox}
                onBboxChange={handleBboxChange}
                onSelectionComplete={handleSelectionComplete}
              />
            </div>

            <div className="flex-1">
              <h3 className="text-sm font-semibold mb-2 text-neutral-700 dark:text-neutral-300 flex justify-center">
                <span className="w-full" style={{ maxWidth: '512px' }}>Pixel Grid (128×64)</span>
              </h3>
              {item.preview_url ? (
                <PixelGrid
                  key={item.preview_url}
                  previewUrl={item.preview_url}
                  overrides={item.state.overrides}
                  onPixelToggle={handlePixelToggle}
                />
              ) : (
                <div className="py-10 text-center text-neutral-500 dark:text-neutral-400">
                  No preview available. Click "Re-run" to generate preview.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="pt-4 pb-4 flex gap-4">
          <div className="flex-1 flex flex-col">
          <h3 className="text-sm font-semibold mb-2 text-neutral-700 dark:text-neutral-300">SVG Preview</h3>
            <div className="flex-1">
          <SVGPreview svgUrl={item.svg_url} />
            </div>
        </div>

          <div className="flex-1 flex flex-col">
          <h3 className="text-sm font-semibold mb-2 text-neutral-700 dark:text-neutral-300">Notes</h3>
          <textarea
            value={item.state.notes}
            onChange={(e) => handleNotesChange(e.target.value)}
              className="w-full h-full p-2 border border-neutral-300 dark:border-neutral-700 rounded text-sm bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 resize-none"
          />
          </div>
        </div>
      </div>

      {/* Floating toolbar at bottom */}
      <div className="absolute bottom-0 left-0 right-0 px-6 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-lg flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold font-mono text-neutral-700 dark:text-neutral-300">{item.id}</h2>
          {items && (() => {
            const currentIndex = items.findIndex(i => i.id === itemId)
            const totalCount = items.length
            if (currentIndex >= 0 && totalCount > 0) {
              return (
                <span className="text-sm text-neutral-500 dark:text-neutral-400">
                  {currentIndex + 1}/{totalCount}
                </span>
              )
            }
            return null
          })()}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-md text-xs font-medium bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={() => handleRerun()}
            disabled={saving}
            className="px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-md text-xs font-medium bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Re-run
          </button>
        </div>
      </div>
    </div>
  )
}
