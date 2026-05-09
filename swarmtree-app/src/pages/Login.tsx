import { useNavigate } from "react-router-dom"
import { Wallet } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useAuth } from "@/hooks/useAuth"

export default function Login() {
  const navigate = useNavigate()
  const { connect } = useAuth()

  function handleConnect() {
    connect()
    navigate("/dashboard")
  }

  return (
    <main className="min-h-svh flex items-center justify-center px-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome to Swarmtree</CardTitle>
          <CardDescription>
            Your links page, hash-addressed and wallet-owned.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button onClick={handleConnect} className="w-full" size="lg">
            <Wallet />
            Connect Wallet
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            v1 placeholder — wagmi wiring lands once a WalletConnect project id
            is configured. For now this just enters the dashboard.
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
