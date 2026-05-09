import { useEffect, useState } from "react"

const AUTH_KEY = "swarmtree:connected"

// v1 placeholder for wagmi wallet connect.
// Replaces with real wagmi connector once VITE_WALLETCONNECT_PROJECT_ID is set.
export function useAuth() {
  const [connected, setConnected] = useState<boolean>(() => {
    if (typeof window === "undefined") return false
    return window.localStorage.getItem(AUTH_KEY) === "1"
  })

  useEffect(() => {
    if (connected) window.localStorage.setItem(AUTH_KEY, "1")
    else window.localStorage.removeItem(AUTH_KEY)
  }, [connected])

  return {
    connected,
    connect: () => setConnected(true),
    disconnect: () => setConnected(false),
  }
}
