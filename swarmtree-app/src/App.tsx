import { HashRouter, Navigate, Route, Routes } from "react-router-dom"
import type { ReactNode } from "react"

import Dashboard from "@/pages/Dashboard"
import Login from "@/pages/Login"
import { useAuth } from "@/hooks/useAuth"

function RequireAuth({ children }: { children: ReactNode }) {
  const { connected } = useAuth()
  if (!connected) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Login />} />
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
