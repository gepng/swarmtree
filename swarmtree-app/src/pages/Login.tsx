import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAccount } from "wagmi"
import { ConnectButton } from "@rainbow-me/rainbowkit"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function Login() {
  const navigate = useNavigate()
  const { isConnected } = useAccount()

  useEffect(() => {
    if (isConnected) navigate("/dashboard")
  }, [isConnected, navigate])

  return (
    <main className="min-h-svh flex items-center justify-center px-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome to Swarmtree</CardTitle>
          <CardDescription>
            Your links page, hash-addressed and wallet-owned.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <ConnectButton showBalance={false} />
          <p className="text-xs text-muted-foreground text-center">
            Connect a wallet to manage your profile. We never write to chain in
            v1 — your address is just your identity.
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
