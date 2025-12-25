/**
 * Theme-aware signal path diagram for Analog Four MKII
 * Replaces the static JPEG with an SVG that adapts to light/dark themes
 * Uses Tailwind classes for theme-aware colors instead of CSS variables in SVG style block
 */
export function SignalPathDiagram() {
  // Common styles as inline style objects for reliable rendering
  const textStyle = {
    fontFamily: "Inter, Arial, sans-serif",
  };

  const titleStyle = {
    ...textStyle,
    fontSize: "13px",
    fontWeight: 600,
    letterSpacing: "0.02em",
  };

  const labelStyle = {
    ...textStyle,
    fontSize: "10px",
    fontWeight: 400,
  };

  return (
    <div className="my-6 flex justify-center">
      {/* Light mode SVG */}
      <svg
        width="1200"
        height="416"
        viewBox="0 0 1200 416"
        xmlns="http://www.w3.org/2000/svg"
        className="max-w-full h-auto dark:hidden"
        aria-label="Analog Four MKII Signal Path"
      >
        {/* OSC 1 */}
        <rect x="40" y="48" width="168" height="48" fill="#fff" stroke="#000" strokeWidth={2} />
        <text x="124" y="76" textAnchor="middle" fill="#000" style={titleStyle}>
          OSCILLATOR 1
        </text>

        {/* OSC 2 */}
        <rect x="40" y="136" width="168" height="48" fill="#fff" stroke="#000" strokeWidth={2} />
        <text x="124" y="164" textAnchor="middle" fill="#000" style={titleStyle}>
          OSCILLATOR 2
        </text>

        {/* SUB */}
        <rect x="232" y="56" width="88" height="32" fill="#fff" stroke="#000" strokeWidth={2} />
        <text x="276" y="76" textAnchor="middle" fill="#000" style={labelStyle}>
          SUB OSC
        </text>

        <rect x="232" y="144" width="88" height="32" fill="#fff" stroke="#000" strokeWidth={2} />
        <text x="276" y="164" textAnchor="middle" fill="#000" style={labelStyle}>
          SUB OSC
        </text>

        {/* CONTROL */}
        <line x1="124" y1="96" x2="124" y2="136" stroke="#000" strokeWidth={2} strokeDasharray="6 6" />
        <text x="132" y="116" fill="#000" style={labelStyle}>
          FM / SYNC
        </text>

        {/* NOISE */}
        <rect x="40" y="264" width="168" height="48" fill="#fff" stroke="#000" strokeWidth={2} />
        <text x="124" y="292" textAnchor="middle" fill="#000" style={titleStyle}>
          NOISE
        </text>

        {/* LADDER */}
        <rect x="368" y="104" width="184" height="112" fill="#fff" stroke="#000" strokeWidth={2} />
        <text x="460" y="164" textAnchor="middle" fill="#000" style={titleStyle}>
          LADDER FILTER
        </text>

        {/* ROUTING LABEL */}
        <text x="368" y="96" fill="#000" style={labelStyle}>
          FILTER ROUTING
        </text>

        {/* CHAIN */}
        <rect x="584" y="136" width="96" height="48" fill="#fff" stroke="#000" strokeWidth={2} />
        <text x="632" y="164" textAnchor="middle" fill="#000" style={titleStyle}>
          DRIVE
        </text>

        <rect x="712" y="136" width="184" height="48" fill="#fff" stroke="#000" strokeWidth={2} />
        <text x="804" y="164" textAnchor="middle" fill="#000" style={titleStyle}>
          MULTIMODE FILTER
        </text>

        <rect x="928" y="136" width="120" height="48" fill="#fff" stroke="#000" strokeWidth={2} />
        <text x="988" y="164" textAnchor="middle" fill="#000" style={titleStyle}>
          VCA / PAN
        </text>

        {/* AUDIO LINES */}
        <line x1="208" y1="72" x2="232" y2="72" stroke="#000" strokeWidth={2} />
        <line x1="208" y1="160" x2="232" y2="160" stroke="#000" strokeWidth={2} />
        <line x1="320" y1="72" x2="368" y2="128" stroke="#000" strokeWidth={2} />
        <line x1="320" y1="160" x2="368" y2="192" stroke="#000" strokeWidth={2} />
        <line x1="208" y1="288" x2="368" y2="216" stroke="#000" strokeWidth={2} />
        <line x1="552" y1="160" x2="584" y2="160" stroke="#000" strokeWidth={2} />
        <line x1="680" y1="160" x2="712" y2="160" stroke="#000" strokeWidth={2} />
        <line x1="896" y1="160" x2="928" y2="160" stroke="#000" strokeWidth={2} />
      </svg>

      {/* Dark mode SVG */}
      <svg
        width="1200"
        height="416"
        viewBox="0 0 1200 416"
        xmlns="http://www.w3.org/2000/svg"
        className="max-w-full h-auto hidden dark:block"
        aria-label="Analog Four MKII Signal Path"
      >
        {/* OSC 1 */}
        <rect x="40" y="48" width="168" height="48" fill="#0a0a0a" stroke="#fafafa" strokeWidth={2} />
        <text x="124" y="76" textAnchor="middle" fill="#fafafa" style={titleStyle}>
          OSCILLATOR 1
        </text>

        {/* OSC 2 */}
        <rect x="40" y="136" width="168" height="48" fill="#0a0a0a" stroke="#fafafa" strokeWidth={2} />
        <text x="124" y="164" textAnchor="middle" fill="#fafafa" style={titleStyle}>
          OSCILLATOR 2
        </text>

        {/* SUB */}
        <rect x="232" y="56" width="88" height="32" fill="#0a0a0a" stroke="#fafafa" strokeWidth={2} />
        <text x="276" y="76" textAnchor="middle" fill="#fafafa" style={labelStyle}>
          SUB OSC
        </text>

        <rect x="232" y="144" width="88" height="32" fill="#0a0a0a" stroke="#fafafa" strokeWidth={2} />
        <text x="276" y="164" textAnchor="middle" fill="#fafafa" style={labelStyle}>
          SUB OSC
        </text>

        {/* CONTROL */}
        <line x1="124" y1="96" x2="124" y2="136" stroke="#fafafa" strokeWidth={2} strokeDasharray="6 6" />
        <text x="132" y="116" fill="#fafafa" style={labelStyle}>
          FM / SYNC
        </text>

        {/* NOISE */}
        <rect x="40" y="264" width="168" height="48" fill="#0a0a0a" stroke="#fafafa" strokeWidth={2} />
        <text x="124" y="292" textAnchor="middle" fill="#fafafa" style={titleStyle}>
          NOISE
        </text>

        {/* LADDER */}
        <rect x="368" y="104" width="184" height="112" fill="#0a0a0a" stroke="#fafafa" strokeWidth={2} />
        <text x="460" y="164" textAnchor="middle" fill="#fafafa" style={titleStyle}>
          LADDER FILTER
        </text>

        {/* ROUTING LABEL */}
        <text x="368" y="96" fill="#fafafa" style={labelStyle}>
          FILTER ROUTING
        </text>

        {/* CHAIN */}
        <rect x="584" y="136" width="96" height="48" fill="#0a0a0a" stroke="#fafafa" strokeWidth={2} />
        <text x="632" y="164" textAnchor="middle" fill="#fafafa" style={titleStyle}>
          DRIVE
        </text>

        <rect x="712" y="136" width="184" height="48" fill="#0a0a0a" stroke="#fafafa" strokeWidth={2} />
        <text x="804" y="164" textAnchor="middle" fill="#fafafa" style={titleStyle}>
          MULTIMODE FILTER
        </text>

        <rect x="928" y="136" width="120" height="48" fill="#0a0a0a" stroke="#fafafa" strokeWidth={2} />
        <text x="988" y="164" textAnchor="middle" fill="#fafafa" style={titleStyle}>
          VCA / PAN
        </text>

        {/* AUDIO LINES */}
        <line x1="208" y1="72" x2="232" y2="72" stroke="#fafafa" strokeWidth={2} />
        <line x1="208" y1="160" x2="232" y2="160" stroke="#fafafa" strokeWidth={2} />
        <line x1="320" y1="72" x2="368" y2="128" stroke="#fafafa" strokeWidth={2} />
        <line x1="320" y1="160" x2="368" y2="192" stroke="#fafafa" strokeWidth={2} />
        <line x1="208" y1="288" x2="368" y2="216" stroke="#fafafa" strokeWidth={2} />
        <line x1="552" y1="160" x2="584" y2="160" stroke="#fafafa" strokeWidth={2} />
        <line x1="680" y1="160" x2="712" y2="160" stroke="#fafafa" strokeWidth={2} />
        <line x1="896" y1="160" x2="928" y2="160" stroke="#fafafa" strokeWidth={2} />
      </svg>
    </div>
  );
}
