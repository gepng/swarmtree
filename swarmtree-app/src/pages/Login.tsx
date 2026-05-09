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
    <main className="min-h-svh flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-md flex flex-col gap-6">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Welcome to Swarmtree</CardTitle>
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
