import { useCallback, useState } from "react"

const STORAGE_KEY = "swarmtree:batchId"

export function useStamp() {
  const [batchId, setBatchIdState] = useState<string>(() => {
    if (typeof window === "undefined") return ""
    return window.localStorage.getItem(STORAGE_KEY) || ""
  })

  const setBatchId = useCallback((value: string) => {
    const trimmed = value.trim()
    setBatchIdState(trimmed)
    if (trimmed) window.localStorage.setItem(STORAGE_KEY, trimmed)
    else window.localStorage.removeItem(STORAGE_KEY)
  }, [])

  return { batchId, setBatchId }
}
