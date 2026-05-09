import { HashRouter, Navigate, Route, Routes } from "react-router-dom"
import type { ReactNode } from "react"
import { useAccount } from "wagmi"

import Dashboard from "@/pages/Dashboard"
import Login from "@/pages/Login"
import Profile from "@/pages/Profile"

function RequireAuth({ children }: { children: ReactNode }) {
  const { isConnected } = useAccount()
  if (!isConnected) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/u/:identifier" element={<Profile />} />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
