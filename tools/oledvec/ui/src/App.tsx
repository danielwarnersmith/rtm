import { useState, useEffect, useRef } from 'react'
import { listItems, getDevice, updateItemState, type Item } from './api'
import { ThemeProvider } from './components/ThemeProvider'
import Sidebar from './components/Sidebar'
import Editor from './components/Editor'

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

type FilterStatus = 'all' | 'ok' | 'needs_review' | 'rejected'

function App() {
  const [items, setItems] = useState<Item[]>([])
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [device, setDevice] = useState<string>('')
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [statusMenuOpen, setStatusMenuOpen] = useState(false)
  const [statusMenuIndex, setStatusMenuIndex] = useState(0)

  const filteredItems = filter === 'all' 
    ? items 
    : items.filter(item => item.status === filter)

  // If selected item is not in filtered list, select next item in filtered list
  useEffect(() => {
    if (filteredItems.length > 0 && selectedItemId) {
      const isSelectedInFiltered = filteredItems.some(item => item.id === selectedItemId)
      if (!isSelectedInFiltered) {
        // Find the index of the previously selected item in the full items list
        const previousIndex = items.findIndex(item => item.id === selectedItemId)
        if (previousIndex >= 0) {
          // Find the next item after the previous selection that's in the filtered list
          let nextItem = null
          for (let i = previousIndex + 1; i < items.length; i++) {
            if (filteredItems.some(item => item.id === items[i].id)) {
              nextItem = items[i]
              break
            }
          }
          // If no next item found, look backwards
          if (!nextItem) {
            for (let i = previousIndex - 1; i >= 0; i--) {
              if (filteredItems.some(item => item.id === items[i].id)) {
                nextItem = items[i]
                break
              }
            }
          }
          // If still no item found, use first in filtered list
          setSelectedItemId(nextItem?.id || filteredItems[0].id)
        } else {
          setSelectedItemId(filteredItems[0].id)
        }
      }
    } else if (filteredItems.length > 0 && !selectedItemId) {
      setSelectedItemId(filteredItems[0].id)
    } else if (filteredItems.length === 0) {
      setSelectedItemId(null)
    }
  }, [filter, filteredItems, selectedItemId, items])

  useEffect(() => {
    loadItems()
  }, [])

  // Handle keyboard shortcuts for navigation (j/k) and status menu (Ctrl+j/k)
  useEffect(() => {
    const statusOptions: Array<Item['status']> = ['ok', 'needs_review', 'rejected']
    
    function handleKeyDown(e: KeyboardEvent) {
      // Only handle shortcuts when not typing in inputs
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      // Control key held - open status menu and navigate with j/k
      if (e.ctrlKey && !e.metaKey && !e.altKey) {
        if (!statusMenuOpen && selectedItemId) {
          // Open status menu when Control is first pressed
          setStatusMenuOpen(true)
          setStatusMenuIndex(0)
          e.preventDefault()
          return
        }
        
        if (statusMenuOpen) {
          if (e.key === 'j') {
            e.preventDefault()
            setStatusMenuIndex((prev) => (prev + 1) % statusOptions.length)
          } else if (e.key === 'k') {
            e.preventDefault()
            setStatusMenuIndex((prev) => (prev - 1 + statusOptions.length) % statusOptions.length)
          }
          return
        }
      }

      // j/k for navigation - use filtered items (only when Control is not held)
      if (e.key === 'j' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        if (filteredItems.length === 0) return
        
        const currentIndex = filteredItems.findIndex(item => item.id === selectedItemId)
        if (currentIndex < filteredItems.length - 1) {
          setSelectedItemId(filteredItems[currentIndex + 1].id)
        } else {
          // Wrap to first item
          setSelectedItemId(filteredItems[0].id)
        }
      } else if (e.key === 'k' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        if (filteredItems.length === 0) return
        
        const currentIndex = filteredItems.findIndex(item => item.id === selectedItemId)
        if (currentIndex > 0) {
          setSelectedItemId(filteredItems[currentIndex - 1].id)
        } else {
          // Wrap to last item
          setSelectedItemId(filteredItems[filteredItems.length - 1].id)
        }
      }
    }

    function handleKeyUp(e: KeyboardEvent) {
      // When Control is released, apply the selected status
      if (statusMenuOpen && !e.ctrlKey && selectedItemId) {
        const selectedStatus = statusOptions[statusMenuIndex]
        setStatusMenuOpen(false)
        // Apply the status change immediately
        updateItemState(selectedItemId, { manual_status: selectedStatus })
          .then(() => {
            // Update the item in the list without full reload to preserve scroll
            setItems(prevItems => 
              prevItems.map(item => 
                item.id === selectedItemId ? { ...item, status: selectedStatus } : item
              )
            )
          })
          .catch((err) => {
            console.error('Failed to update status:', err)
            alert(`Failed to update status: ${err instanceof Error ? err.message : 'Unknown error'}`)
            // Reload on error to get correct state
            loadItems()
          })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [filteredItems, selectedItemId, statusMenuOpen, statusMenuIndex])

  // Load device after items are loaded (can use items as fallback)
  useEffect(() => {
    async function loadDeviceWithFallback() {
      try {
        const data = await getDevice()
        setDevice(data.device)
      } catch (err) {
        console.error('Failed to load device:', err)
        // Try to extract device from items if API fails (fallback)
        if (items.length > 0 && items[0].source_url) {
          // Extract device from URL like "/api/public/oled/analog-four-mkii/..."
          const match = items[0].source_url.match(/\/oled\/([^/]+)\//)
          if (match && match[1]) {
            setDevice(match[1])
            return
          }
        }
        setDevice('')
      }
    }
    
    if (items.length > 0) {
      loadDeviceWithFallback()
    }
  }, [items])

  async function loadItems() {
    try {
      setLoading(true)
      setError(null)
      const itemsList = await listItems()
      setItems(itemsList)
      if (itemsList.length > 0 && !selectedItemId) {
        setSelectedItemId(itemsList[0].id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load items')
    } finally {
      setLoading(false)
    }
  }


  return (
    <ThemeProvider>
      <div className="flex w-full h-screen overflow-hidden bg-[#F5F1EB] dark:bg-neutral-950">
      <Sidebar
        items={items}
        selectedId={selectedItemId}
        onSelect={setSelectedItemId}
        onStatusChange={loadItems}
        device={device}
        filter={filter}
        onFilterChange={setFilter}
        statusMenuOpen={statusMenuOpen}
        statusMenuIndex={statusMenuIndex}
      />
        <div className="flex-1 flex flex-col overflow-hidden bg-[#F5F1EB] dark:bg-neutral-950">
          <div className="flex-1 overflow-auto">
            {loading && (
              <div className="flex items-center justify-center w-full h-full text-lg">
                Loading...
              </div>
            )}
            {error && (
              <div className="flex items-center justify-center w-full h-full text-lg text-red-600 dark:text-red-400">
                Error: {error}
              </div>
            )}
            {!loading && !error && (
              <>
        {selectedItemId ? (
          <Editor
            itemId={selectedItemId}
            onRerun={loadItems}
            items={items}
          />
        ) : (
                  <div className="flex items-center justify-center w-full h-full">
                    Select an item to edit
                  </div>
                )}
              </>
        )}
      </div>
    </div>
      </div>
    </ThemeProvider>
  )
}

export default App
