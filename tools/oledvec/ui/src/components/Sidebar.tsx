import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Item, updateItemState } from '../api'
import { ThemeToggle } from './ThemeToggle'

type FilterStatus = 'all' | 'ok' | 'needs_review' | 'rejected'

interface SidebarProps {
  items: Item[]
  selectedId: string | null
  onSelect: (id: string) => void
  onStatusChange?: () => void | Promise<void>
  device?: string
  filter: FilterStatus
  onFilterChange: (filter: FilterStatus) => void
}

function formatDeviceName(device: string): string {
  // Convert "analog-rytm-mkii" to "Analog Rytm MKII"
  return device
    .split('-')
    .map((word) => {
      // Capitalize first letter, handle acronyms like "mkii" -> "MKII"
      if (word.toLowerCase().startsWith('mk')) {
        return word.toUpperCase()
      }
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(' ')
}

export default function Sidebar({ items, selectedId, onSelect, onStatusChange, device, filter, onFilterChange }: SidebarProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [contextMenu, setContextMenu] = useState<{ itemId: string; x: number; y: number } | null>(null)
  const [bulkUpdating, setBulkUpdating] = useState(false)
  const [overflowMenuOpen, setOverflowMenuOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)
  const overflowMenuRef = useRef<HTMLDivElement>(null)
  
  const filteredItems = filter === 'all' 
    ? items 
    : items.filter(item => item.status === filter)
  
  const filteredCount = filteredItems.length
  const rejectedCount = items.filter(item => item.status === 'rejected').length

  const handleStatusChange = async (itemId: string, newStatus: Item['status']) => {
    try {
      setContextMenu(null)
      // Optimistically update the local items list
      const updatedItems = items.map(item => 
        item.id === itemId ? { ...item, status: newStatus } : item
      )
      // Note: This won't actually update the parent's items, but we'll refresh below
      
      await updateItemState(itemId, { manual_status: newStatus })
      
      // Refresh the items list to get the updated status from the server
      if (onStatusChange) {
        const result = onStatusChange()
        if (result instanceof Promise) {
          await result
        }
      }
    } catch (err) {
      console.error('Failed to update status:', err)
      alert(`Failed to update status: ${err instanceof Error ? err.message : 'Unknown error'}`)
      // Refresh anyway to get the current state
      if (onStatusChange) {
        onStatusChange()
      }
    }
  }

  const handleContextMenu = (e: React.MouseEvent, itemId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ itemId, x: e.clientX, y: e.clientY })
  }

  const handleBulkUpdateRejected = async () => {
    const rejectedItems = items.filter(item => item.status === 'rejected')
    if (rejectedItems.length === 0) {
      alert('No rejected items to update')
      return
    }

    if (!confirm(`Update ${rejectedItems.length} rejected item(s) to "Needs Review"?`)) {
      return
    }

    setBulkUpdating(true)
    try {
      // Update all rejected items to needs_review
      const updatePromises = rejectedItems.map(item => 
        updateItemState(item.id, { manual_status: 'needs_review' })
      )
      await Promise.all(updatePromises)
      
      // Refresh the items list
      if (onStatusChange) {
        const result = onStatusChange()
        if (result instanceof Promise) {
          await result
        }
      }
    } catch (err) {
      console.error('Failed to bulk update items:', err)
      alert(`Failed to update items: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setBulkUpdating(false)
    }
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenu) {
        setContextMenu(null)
      }
      if (overflowMenuOpen && overflowMenuRef.current && !overflowMenuRef.current.contains(e.target as Node)) {
        setOverflowMenuOpen(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [contextMenu, overflowMenuOpen])

  // Scroll selected item into view when selection changes
  useEffect(() => {
    if (selectedId && scrollContainerRef.current) {
      // Use a small delay to ensure DOM is updated
      const timer = setTimeout(() => {
        const selectedElement = scrollContainerRef.current?.querySelector(
          `[data-item-id="${selectedId}"]`
        ) as HTMLElement
        if (selectedElement) {
          selectedElement.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
          })
        }
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [selectedId, filteredItems])
  function getStatusBadge(status: Item['status']) {
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
      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase ${badgeClasses[status]}`}>
        {labels[status]}
      </span>
    )
  }

  return (
    <div className="w-[280px] bg-white dark:bg-neutral-950 border-r border-neutral-200 dark:border-neutral-800 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 relative overflow-visible">
        {device && (
          <div className="text-base font-semibold text-neutral-900 dark:text-white mb-3">
            {formatDeviceName(device)} Screens
          </div>
        )}
        <div className="flex items-center gap-1 mb-2">
          <button
            onClick={() => onFilterChange('all')}
            className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            }`}
          >
            All
          </button>
          <button
            onClick={() => onFilterChange('ok')}
            className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
              filter === 'ok'
                ? 'bg-green-600 text-white'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            }`}
          >
            Ok
          </button>
          <button
            onClick={() => onFilterChange('needs_review')}
            className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
              filter === 'needs_review'
                ? 'bg-yellow-600 text-white'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            }`}
          >
            Review
          </button>
          <button
            onClick={() => onFilterChange('rejected')}
            className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
              filter === 'rejected'
                ? 'bg-red-600 text-white'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            }`}
          >
            Rejected
          </button>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-xs text-neutral-500 dark:text-neutral-400">{filteredCount} items</div>
            {rejectedCount > 0 && (
              <div className="relative" ref={overflowMenuRef}>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (overflowMenuRef.current) {
                      const rect = overflowMenuRef.current.getBoundingClientRect()
                      setMenuPosition({
                        top: rect.bottom + 4,
                        left: rect.left
                      })
                    }
                    setOverflowMenuOpen(!overflowMenuOpen)
                  }}
                  className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                  aria-label="More options"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
                {overflowMenuOpen && menuPosition && typeof document !== 'undefined' && createPortal(
                  <div 
                    className="fixed z-[100] w-56 rounded-md bg-white dark:bg-neutral-800 shadow-lg border border-neutral-200 dark:border-neutral-700 py-1"
                    style={{
                      top: `${menuPosition.top}px`,
                      left: `${menuPosition.left}px`
                    }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setOverflowMenuOpen(false)
                        handleBulkUpdateRejected()
                      }}
                      disabled={bulkUpdating}
                      className="w-full px-4 py-2 text-left text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {bulkUpdating ? 'Updating...' : `Mark ${rejectedCount} rejected as Review`}
                    </button>
                  </div>,
                  document.body
                )}
              </div>
            )}
          </div>
          <ThemeToggle />
        </div>
      </div>
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            data-item-id={item.id}
            className={`px-4 py-3 border-b border-neutral-100 dark:border-neutral-900 cursor-pointer transition-colors ${
              selectedId === item.id
                ? 'bg-blue-50 dark:bg-blue-950/30 border-l-[3px] border-l-blue-500'
                : 'hover:bg-neutral-50 dark:hover:bg-neutral-900'
            }`}
            onClick={() => onSelect(item.id)}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium font-mono">{item.id}</span>
              <div
                onContextMenu={(e) => handleContextMenu(e, item.id)}
                className="cursor-pointer"
                title="Right-click to change status"
              >
                {getStatusBadge(item.status)}
              </div>
            </div>
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
              <span className="font-mono">
                Confidence: {(item.confidence * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        ))}
      </div>
      {contextMenu && (
        <div
          className="fixed bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg z-50 py-1 min-w-[120px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => handleStatusChange(contextMenu.itemId, 'ok')}
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center gap-2"
          >
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            OK
          </button>
          <button
            onClick={() => handleStatusChange(contextMenu.itemId, 'needs_review')}
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center gap-2"
          >
            <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
            Needs Review
          </button>
          <button
            onClick={() => handleStatusChange(contextMenu.itemId, 'rejected')}
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center gap-2"
          >
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            Rejected
          </button>
        </div>
      )}
    </div>
  )
}
