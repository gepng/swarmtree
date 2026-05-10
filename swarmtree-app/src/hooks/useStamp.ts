import { useEffect, useState } from "react"
import { Bee } from "@ethersphere/bee-js"

const STORAGE_KEY = "swarmtree:selectedBatchId"

export interface StampSummary {
  batchId: string
  label: string
  usage: number
  usageText: string
  depth: number
}

interface UseStampsResult {
  stamps: StampSummary[]
  loading: boolean
  error: string | null
  selectedId: string
  setSelectedId: (id: string) => void
  refetch: () => void
}

// Pulls usable postage batches from the user's local Bee node. Persists the
// chosen batch in localStorage so it sticks across reloads.
export function useStamps(beeUrl: string): UseStampsResult {
  const [stamps, setStamps] = useState<StampSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const [selectedId, setSelectedIdState] = useState<string>(() => {
    if (typeof window === "undefined") return ""
    return window.localStorage.getItem(STORAGE_KEY) || ""
  })

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const bee = new Bee(beeUrl)
    bee
      .getPostageBatches()
      .then((batches) => {
        if (cancelled) return
        const summary: StampSummary[] = batches
          .filter((b) => b.usable)
          .map((b) => ({
            batchId: b.batchID.toHex(),
            label: b.label || "(unlabeled)",
            usage: b.usage,
            usageText: b.usageText,
            depth: b.depth,
          }))
        setStamps(summary)
        // Auto-select first usable stamp if nothing is currently selected
        // or if the previously-selected one is no longer present.
        setSelectedIdState((prev) => {
          if (prev && summary.some((s) => s.batchId === prev)) return prev
          return summary[0]?.batchId ?? ""
        })
      })
      .catch((e) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [beeUrl, tick])

  // Persist any selection change.
  useEffect(() => {
    if (typeof window === "undefined") return
    if (selectedId) window.localStorage.setItem(STORAGE_KEY, selectedId)
    else window.localStorage.removeItem(STORAGE_KEY)
  }, [selectedId])

  return {
    stamps,
    loading,
    error,
    selectedId,
    setSelectedId: setSelectedIdState,
    refetch: () => setTick((t) => t + 1),
  }
}
