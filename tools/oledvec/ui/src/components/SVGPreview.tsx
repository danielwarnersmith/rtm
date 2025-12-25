import { useEffect, useState, useMemo } from 'react'

interface SVGPreviewProps {
  svgUrl: string | null
}

export default function SVGPreview({ svgUrl }: SVGPreviewProps) {
  const [svgContent, setSvgContent] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null)
  const [isDark, setIsDark] = useState(false)

  // Check for dark mode (only in browser) - must be before early returns
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const checkDarkMode = () => {
      try {
        setIsDark(document.documentElement.classList.contains('dark'))
      } catch (err) {
        console.error('Error checking dark mode:', err)
      }
    }
    checkDarkMode()
    
    const observer = new MutationObserver(checkDarkMode)
    try {
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class']
      })
    } catch (err) {
      console.error('Error setting up dark mode observer:', err)
    }
    
    return () => {
      try {
        observer.disconnect()
      } catch (err) {
        // Ignore errors on cleanup
      }
    }
  }, [])

  // Replace CSS variable with explicit colors based on theme
  // MUST be called before any early returns to follow Rules of Hooks
  const processedSvg = useMemo(() => {
    if (!svgContent || typeof svgContent !== 'string') {
      return ''
    }
    try {
      const fillColor = isDark ? '#fafafa' : '#09090b' // neutral-50 for dark, neutral-950 for light
      let processed = svgContent.replace(/fill="var\(--foreground\)"/g, `fill="${fillColor}"`)
      
      // Ensure SVG has explicit width and height for visibility (scale up 4x from viewBox)
      if (processed.includes('viewBox="0 0 128 64"')) {
        processed = processed.replace(
          /<svg([^>]*viewBox="0 0 128 64"[^>]*)>/,
          '<svg$1 width="512" height="256">'
        )
      }
      
      return processed
    } catch (err) {
      console.error('Error processing SVG:', err)
      return svgContent // Return original if processing fails
    }
  }, [svgContent, isDark])

  useEffect(() => {
    if (!svgUrl) {
      setSvgContent('')
      setIsLoading(false)
      setLoadedUrl(null)
      return
    }

    // Only fetch if this is a different URL than what we've already loaded
    if (loadedUrl === svgUrl) {
      return
    }

    setIsLoading(true)
    const abortController = new AbortController()
    
    fetch(svgUrl, { signal: abortController.signal })
      .then(res => {
        if (!res.ok) {
          throw new Error(`Failed to fetch SVG: ${res.statusText}`)
        }
        return res.text()
      })
      .then(text => {
        setSvgContent(text)
        setLoadedUrl(svgUrl)
        setIsLoading(false)
      })
      .catch(err => {
        if (err.name === 'AbortError') {
          return // Request was aborted, ignore
        }
        console.error('Failed to load SVG:', err)
        setIsLoading(false)
        // Only clear content if we don't have any loaded content
        if (!loadedUrl) {
        setSvgContent('')
        }
      })

    return () => {
      abortController.abort()
    }
  }, [svgUrl, loadedUrl])

  if (!svgUrl) {
    return <div className="py-10 text-center text-neutral-500 dark:text-neutral-400">No SVG available</div>
  }

  if (isLoading && !svgContent) {
    return <div className="py-10 text-center text-neutral-500 dark:text-neutral-400">Loading SVG...</div>
  }

  if (!svgContent || !processedSvg) {
    return <div className="py-10 text-center text-neutral-500 dark:text-neutral-400">No SVG content</div>
  }

  return (
    <div className="flex flex-col items-center w-full">
      <div
        className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded p-4 overflow-auto"
        dangerouslySetInnerHTML={{ __html: processedSvg }}
      />
    </div>
  )
}

