import { fallback, http } from "viem"
import { mainnet, gnosis } from "wagmi/chains"
import { getDefaultConfig } from "@rainbow-me/rainbowkit"

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID
const alchemyKey = import.meta.env.VITE_ALCHEMY_API_KEY

if (!projectId) {
  console.warn(
    "[wagmi] VITE_WALLETCONNECT_PROJECT_ID is not set. " +
      "Get one free at https://cloud.walletconnect.com and add it to .env.local. " +
      "Injected wallets (e.g. MetaMask) still work, but WalletConnect QR connections will not."
  )
}

const alchemyMainnet = alchemyKey
  ? `https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`
  : null
const alchemyGnosis = alchemyKey
  ? `https://gnosis-mainnet.g.alchemy.com/v2/${alchemyKey}`
  : null

// Fallback transport: tries Alchemy primary (if set), then public RPCs.
// Bundles ship the Alchemy URL publicly — protect the key with the dashboard's
// domain allowlist (Apps → Networks → Allowed Origins).
export const config = getDefaultConfig({
  appName: "Swarmtree",
  projectId: projectId || "swarmtree-dev-placeholder",
  chains: [mainnet, gnosis],
  ssr: false,
  transports: {
    [mainnet.id]: fallback([
      ...(alchemyMainnet ? [http(alchemyMainnet)] : []),
      http("https://eth.llamarpc.com"),
      http("https://eth-mainnet.public.blastapi.io"),
    ]),
    [gnosis.id]: fallback([
      ...(alchemyGnosis ? [http(alchemyGnosis)] : []),
      http("https://rpc.gnosischain.com"),
      http("https://rpc.gnosis.gateway.fm"),
    ]),
  },
})
