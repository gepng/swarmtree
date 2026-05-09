import { http } from "wagmi"
import { mainnet, gnosis } from "wagmi/chains"
import { getDefaultConfig } from "@rainbow-me/rainbowkit"

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID

if (!projectId) {
  console.warn(
    "[wagmi] VITE_WALLETCONNECT_PROJECT_ID is not set. " +
      "Get one free at https://cloud.walletconnect.com and add it to .env.local. " +
      "Injected wallets (e.g. MetaMask) still work, but WalletConnect QR connections will not."
  )
}

export const config = getDefaultConfig({
  appName: "Swarmtree",
  projectId: projectId || "swarmtree-dev-placeholder",
  chains: [mainnet, gnosis],
  ssr: false,
  transports: {
    [mainnet.id]: http(
      import.meta.env.VITE_MAINNET_RPC_URL || "https://eth.llamarpc.com"
    ),
    [gnosis.id]: http(
      import.meta.env.VITE_GNOSIS_RPC_URL || "https://rpc.gnosischain.com"
    ),
  },
})
