import { useEffect, useState } from "react"
import type { FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { useAccount } from "wagmi"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export default function Login() {
  const navigate = useNavigate()
  const { isConnected } = useAccount()
  const [search, setSearch] = useState("")

  useEffect(() => {
    if (isConnected) navigate("/dashboard")
  }, [isConnected, navigate])

  function handleSearch(e: FormEvent) {
    e.preventDefault()
    const q = search.trim()
    if (!q) return
    navigate(`/u/${q}`)
  }

  return (
    <main className="relative min-h-svh flex items-center justify-center px-4 bg-background overflow-hidden">
      <svg
        aria-hidden="true"
        className="absolute inset-0 w-full h-full text-foreground/[0.07] pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="login-hex"
            width="72"
            height="82"
            patternUnits="userSpaceOnUse"
            patternTransform="translate(0 0)"
          >
            <path
              d="M36 0 L72 20.5 L72 61.5 L36 82 L0 61.5 L0 20.5 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
            />
          </pattern>
          <radialGradient id="login-hex-fade" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
          <mask id="login-hex-mask">
            <rect width="100%" height="100%" fill="url(#login-hex-fade)" />
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="url(#login-hex)"
          mask="url(#login-hex-mask)"
        />
      </svg>
      <div className="relative w-full max-w-md flex flex-col gap-6">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl flex items-center justify-center gap-2">
              <img src="/favicon.svg" alt="" className="size-7" />
              Welcome to Swarmtree
            </CardTitle>
            <CardDescription>
              Your links page, hash-addressed and wallet-owned.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <ConnectButton showBalance={false} />
            <p className="text-xs text-muted-foreground text-center">
              Connect a wallet to manage your profiles.
            </p>
          </CardContent>
        </Card>

        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            placeholder="Look up alice.eth or 0x..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoComplete="off"
          />
          <Button type="submit" variant="outline">
            <Search />
            Look up
          </Button>
        </form>
      </div>
    </main>
  )
}
