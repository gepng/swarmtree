import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { WagmiProvider } from "wagmi"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  RainbowKitProvider,
  darkTheme,
  lightTheme,
} from "@rainbow-me/rainbowkit"

import "@rainbow-me/rainbowkit/styles.css"
import "./index.css"

import App from "./App.tsx"
import { config } from "@/lib/wagmi"

const queryClient = new QueryClient()

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={{
            lightMode: lightTheme({
              accentColor: "#1A7A42",
              accentColorForeground: "#FFFFFF",
              borderRadius: "large",
              fontStack: "system",
              overlayBlur: "small",
            }),
            darkMode: darkTheme({
              accentColor: "#27AE60",
              accentColorForeground: "#FFFFFF",
              borderRadius: "large",
              fontStack: "system",
              overlayBlur: "small",
            }),
          }}
        >
          <App />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>
)
