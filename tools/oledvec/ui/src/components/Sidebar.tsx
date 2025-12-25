import { useState, useEffect, useRef } from 'react'
import { Item, updateItemState } from '../api'

interface SidebarProps {
  items: Item[]
  selectedId: string | null
  onSelect: (id: string) => void
  onStatusChange?: () => void | Promise<void>
}

type FilterStatus = 'all' | 'ok' | 'needs_review' | 'rejected'

export default function Sidebar({ items, selectedId, onSelect, onStatusChange }: SidebarProps) {
  const [filter, setFilter] = useState<FilterStatus>('all')
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [contextMenu, setContextMenu] = useState<{ itemId: string; x: number; y: number } | null>(null)
  
  const filteredItems = filter === 'all' 
    ? items 
    : items.filter(item => item.status === filter)
  
  const filteredCount = filteredItems.length

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

  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(null)
    }
    if (contextMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [contextMenu])

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
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex gap-1 mb-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('ok')}
            className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
              filter === 'ok'
                ? 'bg-green-600 text-white'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            }`}
          >
            Ok
          </button>
          <button
            onClick={() => setFilter('needs_review')}
            className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
              filter === 'needs_review'
                ? 'bg-yellow-600 text-white'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            }`}
          >
            Review
          </button>
          <button
            onClick={() => setFilter('rejected')}
            className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
              filter === 'rejected'
                ? 'bg-red-600 text-white'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            }`}
          >
            Rejected
          </button>
        </div>
        <div className="text-xs text-neutral-500 dark:text-neutral-400">{filteredCount} items</div>
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
