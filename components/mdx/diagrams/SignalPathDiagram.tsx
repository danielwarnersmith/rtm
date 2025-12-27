"use client";

/**
 * Theme-aware signal path diagram for Analog Four MKII
 * Replaces the static JPEG with an SVG that adapts to light/dark themes
 */
export function SignalPathDiagram() {
  return (
    <div className="my-6 flex justify-center">
      <svg
        width="1200"
        height="416"
        viewBox="0 0 1200 416"
        xmlns="http://www.w3.org/2000/svg"
        className="max-w-full h-auto"
        aria-label="Analog Four MKII Signal Path"
      >
        <style>
          {`
            text { 
              font-family: Inter, Arial, sans-serif; 
              fill: hsl(var(--svg-text));
            }
            .module { 
              fill: hsl(var(--svg-module-fill)); 
              stroke: hsl(var(--svg-stroke)); 
              stroke-width: 2;
            }
            .audio { 
              stroke: hsl(var(--svg-stroke)); 
              stroke-width: 2;
            }
            .control { 
              stroke: hsl(var(--svg-stroke)); 
              stroke-width: 2; 
              stroke-dasharray: 6 6;
            }
            .title { 
              font-size: 13px; 
              font-weight: 600; 
              letter-spacing: 0.02em;
            }
            .label { 
              font-size: 10px; 
              font-weight: 400;
            }
          `}
        </style>

        {/* OSC 1 */}
        <rect x="40" y="48" width="168" height="48" className="module" />
        <text x="124" y="76" className="title" textAnchor="middle">
          OSCILLATOR 1
        </text>

        {/* OSC 2 */}
        <rect x="40" y="136" width="168" height="48" className="module" />
        <text x="124" y="164" className="title" textAnchor="middle">
          OSCILLATOR 2
        </text>

        {/* SUB */}
        <rect x="232" y="56" width="88" height="32" className="module" />
        <text x="276" y="76" className="label" textAnchor="middle">
          SUB OSC
        </text>

        <rect x="232" y="144" width="88" height="32" className="module" />
        <text x="276" y="164" className="label" textAnchor="middle">
          SUB OSC
        </text>

        {/* CONTROL */}
        <line x1="124" y1="96" x2="124" y2="136" className="control" />
        <text x="132" y="116" className="label">
          FM / SYNC
        </text>

        {/* NOISE */}
        <rect x="40" y="264" width="168" height="48" className="module" />
        <text x="124" y="292" className="title" textAnchor="middle">
          NOISE
        </text>

        {/* LADDER */}
        <rect x="368" y="104" width="184" height="112" className="module" />
        <text x="460" y="164" className="title" textAnchor="middle">
          LADDER FILTER
        </text>

        {/* ROUTING LABEL */}
        <text x="368" y="96" className="label">
          FILTER ROUTING
        </text>

        {/* CHAIN */}
        <rect x="584" y="136" width="96" height="48" className="module" />
        <text x="632" y="164" className="title" textAnchor="middle">
          DRIVE
        </text>

        <rect x="712" y="136" width="184" height="48" className="module" />
        <text x="804" y="164" className="title" textAnchor="middle">
          MULTIMODE FILTER
        </text>

        <rect x="928" y="136" width="120" height="48" className="module" />
        <text x="988" y="164" className="title" textAnchor="middle">
          VCA / PAN
        </text>

        {/* AUDIO LINES */}
        <line x1="208" y1="72" x2="232" y2="72" className="audio" />
        <line x1="208" y1="160" x2="232" y2="160" className="audio" />

        <line x1="320" y1="72" x2="368" y2="128" className="audio" />
        <line x1="320" y1="160" x2="368" y2="192" className="audio" />

        <line x1="208" y1="288" x2="368" y2="216" className="audio" />

        <line x1="552" y1="160" x2="584" y2="160" className="audio" />
        <line x1="680" y1="160" x2="712" y2="160" className="audio" />
        <line x1="896" y1="160" x2="928" y2="160" className="audio" />
      </svg>
    </div>
  );
}
