import { useEffect, useState } from "react"

import type { Profile } from "@/lib/profile"
import { generateProfileHtml } from "@/lib/profile-generator"

interface PhonePreviewProps {
  profile: Profile
  statusLabel?: string
  statusTone?: "idle" | "uploading" | "success" | "error"
}

const TONE_CLASS: Record<NonNullable<PhonePreviewProps["statusTone"]>, string> =
  {
    idle: "bg-muted text-muted-foreground",
    uploading: "bg-accent/20 text-accent",
    success: "bg-primary/20 text-primary",
    error: "bg-destructive/20 text-destructive",
  }

export function PhonePreview({
  profile,
  statusLabel = "Draft",
  statusTone = "idle",
}: PhonePreviewProps) {
  const [html, setHtml] = useState<string>(() => generateProfileHtml(profile))

  // Debounce regeneration on rapid edits.
  useEffect(() => {
    const t = setTimeout(() => {
      setHtml(generateProfileHtml(profile))
    }, 200)
    return () => clearTimeout(t)
  }, [profile])

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className={`text-[0.7rem] font-medium px-3 py-1 rounded-full ${TONE_CLASS[statusTone]}`}
      >
        {statusLabel}
      </div>

      {/* Phone shell */}
      <div className="relative w-[300px] h-[600px] rounded-[2.5rem] bg-foreground p-3 shadow-[0_30px_60px_-20px_rgb(0_0_0_/_0.35)]">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-foreground rounded-b-2xl z-10" />
        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-16 h-2 bg-background/30 rounded-full z-20" />

        {/* Screen */}
        <div className="rounded-[2rem] overflow-hidden h-full bg-background">
          <iframe
            srcDoc={html}
            title="Live profile preview"
            className="w-full h-full border-0 block"
            sandbox="allow-popups"
          />
        </div>
      </div>
    </div>
  )
}
