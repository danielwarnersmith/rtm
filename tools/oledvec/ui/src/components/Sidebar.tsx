import { Item } from '../api'

interface SidebarProps {
  items: Item[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export default function Sidebar({ items, selectedId, onSelect }: SidebarProps) {
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
        <h2 className="text-lg font-semibold mb-1">OLED Screens</h2>
        <div className="text-xs text-neutral-500 dark:text-neutral-400">{items.length} items</div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {items.map((item) => (
          <div
            key={item.id}
            className={`px-4 py-3 border-b border-neutral-100 dark:border-neutral-900 cursor-pointer transition-colors ${
              selectedId === item.id
                ? 'bg-blue-50 dark:bg-blue-950/30 border-l-[3px] border-l-blue-500'
                : 'hover:bg-neutral-50 dark:hover:bg-neutral-900'
            }`}
            onClick={() => onSelect(item.id)}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium font-mono">{item.id}</span>
              {getStatusBadge(item.status)}
            </div>
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
              <span className="font-mono">
                Confidence: {(item.confidence * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
