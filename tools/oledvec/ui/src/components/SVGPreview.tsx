import { useEffect, useState } from 'react'

interface SVGPreviewProps {
  svgUrl: string | null
}

export default function SVGPreview({ svgUrl }: SVGPreviewProps) {
  const [svgContent, setSvgContent] = useState<string>('')

  useEffect(() => {
    if (!svgUrl) {
      setSvgContent('')
      return
    }

    fetch(svgUrl)
      .then(res => res.text())
      .then(text => setSvgContent(text))
      .catch(err => {
        console.error('Failed to load SVG:', err)
        setSvgContent('')
      })
  }, [svgUrl])

  if (!svgUrl) {
    return <div className="py-10 text-center text-neutral-500 dark:text-neutral-400">No SVG available</div>
  }

  if (!svgContent) {
    return <div className="py-10 text-center text-neutral-500 dark:text-neutral-400">Loading SVG...</div>
  }

  return (
    <div className="flex flex-col items-center">
      <div
        className="w-full max-w-full"
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
    </div>
  )
}
