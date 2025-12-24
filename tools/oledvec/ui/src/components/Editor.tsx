import { useState, useEffect } from 'react'
import { getItem, updateItemState, rerunItem, type ItemResponse, type ItemStateUpdate } from '../api'
import BboxCanvas from './BboxCanvas'
import PixelGrid from './PixelGrid'
import SVGPreview from './SVGPreview'
import './Editor.css'

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

  useEffect(() => {
    loadItem()
  }, [itemId])

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
      // Reload to get updated state
      await loadItem()
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
      await rerunItem(itemId)
      await loadItem()
      onRerun()
    } catch (err) {
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

    setItem({
      ...item,
      state: {
        ...item.state,
        overrides: {
          force_on: forceOn,
          force_off: forceOff,
        },
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
    return <div className="editor-loading">Loading...</div>
  }

  if (error) {
    return <div className="editor-error">Error: {error}</div>
  }

  if (!item) {
    return <div className="editor-error">Item not found</div>
  }

  return (
    <div className="editor">
      <div className="editor-header">
        <h2>{item.id}</h2>
        <div className="editor-actions">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn btn-primary"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={handleRerun}
            disabled={saving}
            className="btn btn-secondary"
          >
            Re-run
          </button>
        </div>
      </div>

      <div className="editor-content">
        <div className="editor-section">
          <h3>Original Image</h3>
          <BboxCanvas
            sourceUrl={item.source_url}
            bbox={item.state.oled_bbox}
            onBboxChange={handleBboxChange}
          />
        </div>

        <div className="editor-section">
          <h3>Threshold</h3>
          <div className="threshold-controls">
            <label>
              <input
                type="checkbox"
                checked={useAutoThreshold}
                onChange={(e) => setUseAutoThreshold(e.target.checked)}
              />
              Auto (Otsu)
            </label>
            {!useAutoThreshold && (
              <input
                type="range"
                min="0"
                max="255"
                value={threshold ?? 127}
                onChange={(e) => setThreshold(parseInt(e.target.value))}
              />
            )}
            {!useAutoThreshold && threshold !== null && (
              <span className="threshold-value">{threshold}</span>
            )}
          </div>
        </div>

        <div className="editor-section">
          <h3>Pixel Grid (128×64)</h3>
          <PixelGrid
            previewUrl={item.preview_url}
            overrides={item.state.overrides}
            onPixelToggle={handlePixelToggle}
          />
        </div>

        <div className="editor-section">
          <h3>SVG Preview</h3>
          <SVGPreview svgUrl={item.svg_url} />
        </div>

        <div className="editor-section">
          <h3>Notes</h3>
          <textarea
            value={item.state.notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            className="notes-textarea"
            rows={4}
          />
        </div>
      </div>
    </div>
  )
}

