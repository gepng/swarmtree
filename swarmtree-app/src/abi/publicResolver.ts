// Standard ENS Public Resolver — only the bits we need (read + write contenthash).
// Real resolver lookup goes through ENS Registry's resolver(node); the returned
// resolver address may be any contract implementing this surface.
export const publicResolverAbi = [
  {
    name: "contenthash",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "node", type: "bytes32" }],
    outputs: [{ type: "bytes" }],
  },
  {
    name: "setContenthash",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "hash", type: "bytes" },
    ],
    outputs: [],
  },
] as const
