import { useState, useEffect } from 'react'
import { getItem, updateItemState, rerunItem, type ItemResponse, type ItemStateUpdate } from '../api'
import BboxCanvas from './BboxCanvas'
import PixelGrid from './PixelGrid'
import SVGPreview from './SVGPreview'

interface EditorProps {
  itemId: string
  onRerun: () => void
}

export default function Editor({ itemId, onRerun }: EditorProps) {
  const [item, setItem] = useState<ItemResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [threshold, setThreshold] = useState<number | null>(null)
  const [useAutoThreshold, setUseAutoThreshold] = useState(true)
  
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

  // Handle keyboard shortcuts (Cmd+Z for undo, Cmd+Shift+Z for redo)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Only handle shortcuts when the editor is active (prevent interfering with other inputs)
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return // Don't handle shortcuts when typing in inputs
      }

      // Check for Cmd+Z (Mac) or Ctrl+Z (Windows/Linux)
      const isUndo = (e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey
      const isRedo = (e.metaKey || e.ctrlKey) && (e.key === 'z' && e.shiftKey || e.key === 'y')

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
  }, [historyIndex, overrideHistory, item])

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

  async function saveCurrentState() {
    if (!item) return

    const update: ItemStateUpdate = {
      oled_bbox: item.state.oled_bbox,
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
  }

  async function handleSave() {
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
  }

  async function handleRerun() {
    if (!item) return

    setSaving(true)
    try {
      // Auto-save current edits before reprocessing
      await saveCurrentState()
      // Reprocess with the saved state
      const result = await rerunItem(itemId)
      console.log('Rerun result:', { 
        preview_url: result.preview_url, 
        svg_url: result.svg_url,
        is_qualifying: result.state.validation?.is_qualifying 
      })
      // Update item with the new preview_url, svg_url, and state from rerun
      // This ensures the pixel grid gets the preview_url immediately
      const wasAuto = useAutoThreshold
      console.log('Rerun result preview_url:', result.preview_url, 'type:', typeof result.preview_url)
      setItem((prevItem) => {
        if (!prevItem) {
          console.error('Cannot update item: prevItem is null')
          return prevItem
        }
        const updated = {
          ...prevItem,
          preview_url: result.preview_url,
          svg_url: result.svg_url,
          state: result.state,
        }
        console.log('Updated item preview_url:', updated.preview_url, 'full item:', updated)
        return updated
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
      
      // Debug: Check if preview_url is set
      if (!result.preview_url) {
        console.warn('Rerun did not return preview_url. Check server logs for errors.')
      }
      // Reload sidebar to reflect status changes
      onRerun()
    } catch (err) {
      console.error('Rerun error:', err)
      setError(err instanceof Error ? err.message : 'Failed to rerun')
    } finally {
      setSaving(false)
    }
  }

  function handleBboxChange(bbox: number[]) {
    if (!item) return
    setItem({
      ...item,
      state: {
        ...item.state,
        oled_bbox: bbox,
      },
    })
  }

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
      <div className="flex-1 p-6 flex flex-col overflow-y-auto pb-20">
        <div className="pb-2">
          <div className="flex items-center gap-3 mb-2">
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
          </div>
          <div className="flex items-center gap-3">
            {!useAutoThreshold && (
              <>
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={threshold ?? 127}
                  onChange={(e) => setThreshold(parseInt(e.target.value))}
                  className="w-[200px]"
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
              />
            </div>

            <div className="flex-1">
              <h3 className="text-sm font-semibold mb-2 text-neutral-700 dark:text-neutral-300 flex justify-center">
                <span className="w-full" style={{ maxWidth: '512px' }}>Pixel Grid (128×64)</span>
              </h3>
              {(() => {
                console.log('Editor render: item.preview_url =', item.preview_url)
                return item.preview_url ? (
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
                )
              })()}
            </div>
          </div>
        </div>

        <div className="pt-4 pb-4">
          <h3 className="text-sm font-semibold mb-2 text-neutral-700 dark:text-neutral-300">SVG Preview</h3>
          <SVGPreview svgUrl={item.svg_url} />
        </div>

        <div className="pt-4">
          <h3 className="text-sm font-semibold mb-2 text-neutral-700 dark:text-neutral-300">Notes</h3>
          <textarea
            value={item.state.notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            className="w-full p-2 border border-neutral-300 dark:border-neutral-700 rounded text-sm bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 resize-y"
            rows={3}
          />
        </div>
      </div>

      {/* Floating toolbar at bottom */}
      <div className="absolute bottom-0 left-0 right-0 px-6 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-lg flex justify-between items-center z-10">
        <h2 className="text-sm font-semibold font-mono text-neutral-700 dark:text-neutral-300">{item.id}</h2>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md text-sm font-medium bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={handleRerun}
            disabled={saving}
            className="px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md text-sm font-medium bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Re-run
          </button>
        </div>
      </div>
    </div>
  )
}
