import { useState, useEffect } from 'react'
import { listItems, type Item } from './api'
import Sidebar from './components/Sidebar'
import Editor from './components/Editor'
import './App.css'

function App() {
  const [items, setItems] = useState<Item[]>([])
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadItems()
  }, [])

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

  if (loading) {
    return <div className="app-loading">Loading...</div>
  }

  if (error) {
    return <div className="app-error">Error: {error}</div>
  }

  return (
    <div className="app">
      <Sidebar
        items={items}
        selectedId={selectedItemId}
        onSelect={setSelectedItemId}
      />
      <div className="app-main">
        {selectedItemId ? (
          <Editor
            itemId={selectedItemId}
            onRerun={loadItems}
          />
        ) : (
          <div className="app-empty">Select an item to edit</div>
        )}
      </div>
    </div>
  )
}

export default App

