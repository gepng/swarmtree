interface HexBgProps {
  className?: string
}

// Subtle hexagonal pattern, inherits color from currentColor on the wrapping element.
// Use with low opacity (e.g. text-foreground/5) for ambient brand texture.
export function HexBg({ className }: HexBgProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern
          id="swarmtree-hex"
          width="56"
          height="64"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M28 0 L56 16 L56 48 L28 64 L0 48 L0 16 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#swarmtree-hex)" />
    </svg>
  )
}
