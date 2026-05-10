import { useEffect, useState } from "react"
import type { FormEvent } from "react"
import { Link } from "react-router-dom"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import {
  useAccount,
  useEnsName,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi"
import { mainnet } from "wagmi/chains"
import { namehash } from "viem"
import {
  Check,
  Copy,
  ExternalLink,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from "lucide-react"

import { ensRegistryAbi } from "@/abi/ensRegistry"
import { nameWrapperAbi } from "@/abi/nameWrapper"
import { publicResolverAbi } from "@/abi/publicResolver"
import { ENS_REGISTRY, NAME_WRAPPER, ZERO_ADDRESS } from "@/lib/addresses"
import { encodeBzzContenthash } from "@/lib/contenthash"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { Profile } from "@/lib/profile"
import {
  downloadHtml,
  generateProfileHtml,
} from "@/lib/profile-generator"
import { saveProfileHash } from "@/lib/directory"
import { uploadProfileFolder } from "@/lib/upload"
import { useStamps } from "@/hooks/useStamp"
import { HexBg } from "@/components/HexBg"
import { PhonePreview } from "@/components/PhonePreview"

type UploadStatus =
  | { kind: "idle" }
  | { kind: "uploading" }
  | {
      kind: "success"
      reference: string
      bzzUrl: string
      localBzzUrl: string
    }
  | { kind: "error"; message: string }

// Local Bee light node — uploads + stamp listing go here. Bee must be started
// with --cors-allowed-origins "http://localhost:3000" for the browser fetch to work.
const BEE_API_URL =
  import.meta.env.VITE_BEE_API_URL || "http://localhost:1633"
// Shareable public-gateway URL (download.gateway serves HTML; api.gateway
// redirects HTML to a "forbidden" page for phishing protection).
const SWARM_READ_URL =
  import.meta.env.VITE_SWARM_READ_URL || "https://download.gateway.ethswarm.org"

interface LinkItem {
  id: string
  label: string
  url: string
}

const newLink = (): LinkItem => ({
  id: crypto.randomUUID(),
  label: "",
  url: "",
})

export default function Dashboard() {
  const { address } = useAccount()

  // Reverse ENS — primary name for the connected wallet, used to pre-fill the input.
  const { data: primaryEns } = useEnsName({
    address,
    chainId: mainnet.id,
  })

  const [ensInput, setEnsInput] = useState("")
  const [verifiedEns, setVerifiedEns] = useState<string | null>(null)
  const [pendingVerify, setPendingVerify] = useState<string | null>(null)

  // Pre-fill the input once with the primary ENS, leaving manual edits alone.
  useEffect(() => {
    if (primaryEns) setEnsInput((prev) => prev || primaryEns)
  }, [primaryEns])

  // Verify by reading the ENS Registry's manager (the address allowed to write
  // contenthash). Falls through to the NameWrapper for wrapped names.
  const node = pendingVerify ? namehash(pendingVerify) : undefined

  const {
    data: registryOwner,
    isFetching: registryFetching,
    error: registryError,
  } = useReadContract({
    address: ENS_REGISTRY,
    abi: ensRegistryAbi,
    functionName: "owner",
    args: node ? [node] : undefined,
    chainId: mainnet.id,
    query: { enabled: !!node },
  })

  const isWrapped =
    !!registryOwner &&
    registryOwner.toLowerCase() === NAME_WRAPPER.toLowerCase()

  const {
    data: wrappedOwner,
    isFetching: wrappedFetching,
    error: wrappedError,
  } = useReadContract({
    address: NAME_WRAPPER,
    abi: nameWrapperAbi,
    functionName: "ownerOf",
    args: node ? [BigInt(node)] : undefined,
    chainId: mainnet.id,
    query: { enabled: !!node && isWrapped },
  })

  const isVerifying =
    !!pendingVerify && (registryFetching || (isWrapped && wrappedFetching))
  const verifyError = registryError ?? wrappedError
  const controller = isWrapped ? wrappedOwner : registryOwner

  useEffect(() => {
    if (!pendingVerify || isVerifying) return
    if (isWrapped && wrappedOwner === undefined && !wrappedError) return
    const matches =
      !!controller &&
      controller.toLowerCase() !== ZERO_ADDRESS &&
      !!address &&
      controller.toLowerCase() === address.toLowerCase()
    setVerifiedEns(matches ? pendingVerify : null)
  }, [
    pendingVerify,
    isVerifying,
    isWrapped,
    wrappedOwner,
    wrappedError,
    controller,
    address,
  ])

  function handleVerify() {
    const name = ensInput.trim().toLowerCase()
    if (!name) return
    setVerifiedEns(null)
    setPendingVerify(name)
  }

  function handleEnsInputChange(value: string) {
    setEnsInput(value)
    setPendingVerify(null)
    setVerifiedEns(null)
  }

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [links, setLinks] = useState<LinkItem[]>([newLink()])

  function updateLink(id: string, patch: Partial<LinkItem>) {
    setLinks((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...patch } : l))
    )
  }

  function removeLink(id: string) {
    setLinks((prev) =>
      prev.length === 1 ? prev : prev.filter((l) => l.id !== id)
    )
  }

  function addLink() {
    setLinks((prev) => [...prev, newLink()])
  }

  const {
    stamps,
    loading: stampsLoading,
    error: stampsError,
    selectedId,
    setSelectedId,
    refetch: refetchStamps,
  } = useStamps(BEE_API_URL)
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    kind: "idle",
  })
  const [copied, setCopied] = useState<"hash" | "entry" | null>(null)

  function buildProfile(): Profile {
    return {
      version: 1,
      address,
      ens: verifiedEns,
      title,
      description,
      links: links.map((l) => ({ label: l.label, url: l.url })),
      updatedAt: new Date().toISOString(),
    }
  }

  function handleSave(e: FormEvent) {
    e.preventDefault()
    const html = generateProfileHtml(buildProfile())
    downloadHtml(html, "index.html")
  }

  async function handleUpload() {
    if (!address || !selectedId) return
    setUploadStatus({ kind: "uploading" })
    try {
      const html = generateProfileHtml(buildProfile())
      const result = await uploadProfileFolder({
        html,
        batchId: selectedId,
        beeUrl: BEE_API_URL,
        publicGatewayUrl: SWARM_READ_URL,
      })
      saveProfileHash(address, result.reference)
      setUploadStatus({
        kind: "success",
        reference: result.reference,
        bzzUrl: result.bzzUrl,
        localBzzUrl: result.localBzzUrl,
      })
    } catch (err) {
      setUploadStatus({
        kind: "error",
        message: err instanceof Error ? err.message : String(err),
      })
    }
  }

  async function copy(text: string, kind: "hash" | "entry") {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(kind)
      setTimeout(() => setCopied(null), 1500)
    } catch {
      /* clipboard unavailable */
    }
  }

  const isUploading = uploadStatus.kind === "uploading"
  const canUpload = !!selectedId && !!address && !isUploading

  // ENS contenthash publish flow ----------------------------------------------
  // Reads the resolver currently registered for verifiedEns from the ENS
  // Registry, then writes setContenthash(node, bzz://<hash>) on it.
  const verifiedNode = verifiedEns ? namehash(verifiedEns) : undefined
  const { data: resolverAddress } = useReadContract({
    address: ENS_REGISTRY,
    abi: ensRegistryAbi,
    functionName: "resolver",
    args: verifiedNode ? [verifiedNode] : undefined,
    chainId: mainnet.id,
    query: { enabled: !!verifiedNode },
  })

  const {
    writeContractAsync,
    data: publishTxHash,
    isPending: isPublishing,
    error: publishWriteError,
    reset: resetPublish,
  } = useWriteContract()
  const {
    isLoading: isPublishConfirming,
    isSuccess: isPublishConfirmed,
    error: publishConfirmError,
  } = useWaitForTransactionReceipt({
    hash: publishTxHash,
    chainId: mainnet.id,
  })

  // Reset publish state when a fresh upload happens.
  useEffect(() => {
    if (uploadStatus.kind === "success") resetPublish()
    // Intentionally only depend on the new hash so we don't loop while
    // upload is in flight.
  }, [
    uploadStatus.kind === "success" ? uploadStatus.reference : null,
    resetPublish,
  ])

  async function handlePublishEns() {
    if (uploadStatus.kind !== "success") return
    if (!verifiedNode || !resolverAddress) return
    if (resolverAddress.toLowerCase() === ZERO_ADDRESS) return
    try {
      await writeContractAsync({
        address: resolverAddress,
        abi: publicResolverAbi,
        functionName: "setContenthash",
        args: [verifiedNode, encodeBzzContenthash(uploadStatus.reference)],
        chainId: mainnet.id,
      })
    } catch {
      /* error surfaces via publishWriteError */
    }
  }

  const publishError = publishWriteError ?? publishConfirmError
  const canPublish =
    uploadStatus.kind === "success" &&
    !!verifiedEns &&
    !!resolverAddress &&
    resolverAddress.toLowerCase() !== ZERO_ADDRESS &&
    !isPublishing &&
    !isPublishConfirming

  // Live-preview profile: fall back to friendly placeholders so the phone never
  // looks empty, and show pending-but-unverified ENS so users see their handle
  // immediately as they type.
  const filledLinks = links
    .filter((l) => l.label.trim() || l.url.trim())
    .map((l) => ({ label: l.label || "Link", url: l.url || "#" }))
  const previewProfile: Profile = {
    version: 1,
    address,
    ens: verifiedEns ?? (ensInput.trim() ? ensInput.trim() : null),
    title: title.trim() || "Your name",
    description: description.trim() || "Add a short bio to your Swarmtree.",
    links:
      filledLinks.length > 0
        ? filledLinks
        : [
            { label: "Add your first link →", url: "#" },
            { label: "And another", url: "#" },
          ],
  }

  const statusLabel =
    uploadStatus.kind === "uploading"
      ? "Uploading…"
      : uploadStatus.kind === "success"
        ? `Live · ${uploadStatus.reference.slice(0, 8)}…`
        : uploadStatus.kind === "error"
          ? "Upload failed"
          : "Draft"
  const statusTone: "idle" | "uploading" | "success" | "error" =
    uploadStatus.kind

  const showVerified = verifiedEns && pendingVerify === verifiedEns
  const showFailed =
    pendingVerify && !isVerifying && pendingVerify !== verifiedEns

  return (
    <main className="min-h-svh bg-background text-foreground">
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_420px] min-h-svh">
        {/* LEFT RAIL */}
        <aside className="hidden lg:flex flex-col border-r border-border relative overflow-hidden">
          <HexBg className="absolute inset-0 text-foreground/[0.06] pointer-events-none" />
          <div className="relative p-6 flex flex-col h-full gap-6">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/30" />
              <span className="font-display text-lg font-semibold tracking-tight">
                Swarmtree
              </span>
            </Link>

            <nav className="flex flex-col gap-1 mt-2">
              <span className="px-3.5 py-2 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
                Profile
              </span>
              <span className="px-3.5 py-2 rounded-full text-muted-foreground text-sm">
                Design <span className="opacity-60">· soon</span>
              </span>
              <span className="px-3.5 py-2 rounded-full text-muted-foreground text-sm">
                Settings <span className="opacity-60">· soon</span>
              </span>
            </nav>

            <div className="flex-1" />

            <div className="space-y-3">
              <p className="text-[0.65rem] text-muted-foreground uppercase tracking-[0.15em]">
                Wallet
              </p>
              <ConnectButton
                showBalance={false}
                chainStatus="icon"
                accountStatus="avatar"
              />
            </div>
          </div>
        </aside>

        {/* CENTER EDITOR */}
        <section className="px-5 lg:px-10 py-8 lg:py-12 max-w-2xl mx-auto w-full">
          <div className="lg:hidden flex items-center justify-between mb-6">
            <Link to="/" className="flex items-center gap-2">
              <div className="size-7 rounded-lg bg-gradient-to-br from-primary to-accent" />
              <span className="font-display text-base font-semibold">
                Swarmtree
              </span>
            </Link>
            <ConnectButton
              showBalance={false}
              chainStatus="icon"
              accountStatus="avatar"
            />
          </div>

          <div className="mb-8">
            <h1 className="font-display text-3xl lg:text-4xl font-semibold">
              Edit your profile
            </h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-md">
              <strong>Save &amp; upload</strong> publishes directly to Swarm.{" "}
              <strong>Save &amp; download</strong> exports the{" "}
              <code className="text-xs">index.html</code> for manual upload.
            </p>
          </div>

          <form onSubmit={handleSave} className="flex flex-col gap-6">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div className="flex-1">
                <CardTitle>Postage stamp</CardTitle>
                <CardDescription>
                  Pulled live from your Bee node at{" "}
                  <code className="text-xs">{BEE_API_URL}</code>. The chosen
                  stamp authorizes the upload.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={refetchStamps}
                disabled={stampsLoading}
                aria-label="Refresh stamps"
                title="Refresh stamps"
              >
                <RefreshCw
                  className={stampsLoading ? "animate-spin" : undefined}
                />
              </Button>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {stampsLoading ? (
                <p className="text-sm text-muted-foreground inline-flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Loading stamps from your Bee…
                </p>
              ) : stampsError ? (
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-destructive">
                    Couldn't reach Bee at{" "}
                    <code className="text-xs">{BEE_API_URL}</code>.
                  </p>
                  <p className="text-xs text-muted-foreground break-words">
                    {stampsError}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Make sure your node is running and started with{" "}
                    <code className="text-xs">
                      --cors-allowed-origins "http://localhost:3000"
                    </code>
                    .
                  </p>
                </div>
              ) : stamps.length === 0 ? (
                <div className="flex flex-col gap-2">
                  <p className="text-sm">No usable postage stamps yet.</p>
                  <p className="text-xs text-muted-foreground">
                    Buy one from a terminal:{" "}
                    <code className="text-xs">swarm-cli stamp create</code>,
                    then click refresh.
                  </p>
                </div>
              ) : (
                <>
                  <Label htmlFor="batchId">Stamp</Label>
                  <select
                    id="batchId"
                    value={selectedId}
                    onChange={(e) => setSelectedId(e.target.value)}
                    className="font-mono text-xs h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] cursor-pointer"
                  >
                    {stamps.map((s) => (
                      <option key={s.batchId} value={s.batchId}>
                        {s.label} · {s.usageText} used · depth {s.depth} ·{" "}
                        {s.batchId.slice(0, 10)}…
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    {stamps.length} usable stamp{stamps.length === 1 ? "" : "s"}{" "}
                    available. New stamp:{" "}
                    <code className="text-xs">swarm-cli stamp create</code>.
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>ENS handle to attach</CardTitle>
              <CardDescription>
                Verify ownership of an ENS name that resolves to your connected wallet.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Label htmlFor="ens">ENS name</Label>
              <div className="flex gap-2">
                <Input
                  id="ens"
                  placeholder="alice.eth"
                  value={ensInput}
                  onChange={(e) => handleEnsInputChange(e.target.value)}
                  className="flex-1"
                  autoComplete="off"
                />
                <Button
                  type="button"
                  onClick={handleVerify}
                  disabled={!ensInput.trim() || isVerifying}
                >
                  {isVerifying ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    "Verify"
                  )}
                </Button>
              </div>
              {showVerified && (
                <div className="mt-1 flex flex-col gap-1">
                  <p className="text-sm text-green-600 dark:text-green-500 flex items-center gap-1.5">
                    <Check className="size-4" />
                    Verified — your wallet controls {verifiedEns}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Your profile will live at{" "}
                    <code className="bg-muted px-1 py-0.5 rounded">
                      {verifiedEns}.limo
                    </code>
                  </p>
                </div>
              )}
              {showFailed && (
                <p className="mt-1 text-sm text-destructive flex items-center gap-1.5">
                  <X className="size-4" />
                  {verifyError
                    ? "Lookup failed — check the name or try again"
                    : `Your wallet doesn't control ${pendingVerify}`}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="e.g. Alice — Builder, Coffee Drinker"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="A short bio that shows up under your name."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Links</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addLink}
              >
                <Plus />
                Add link
              </Button>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {links.map((link, i) => (
                <div
                  key={link.id}
                  className="grid grid-cols-[1fr_2fr_auto] gap-2 items-end"
                >
                  <div className="flex flex-col gap-2">
                    {i === 0 && (
                      <Label htmlFor={`label-${link.id}`}>Label</Label>
                    )}
                    <Input
                      id={`label-${link.id}`}
                      placeholder="Twitter"
                      value={link.label}
                      onChange={(e) =>
                        updateLink(link.id, { label: e.target.value })
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    {i === 0 && <Label htmlFor={`url-${link.id}`}>URL</Label>}
                    <Input
                      id={`url-${link.id}`}
                      type="url"
                      placeholder="https://..."
                      value={link.url}
                      onChange={(e) =>
                        updateLink(link.id, { url: e.target.value })
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLink(link.id)}
                    disabled={links.length === 1}
                    aria-label="Remove link"
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {(uploadStatus.kind === "success" ||
            uploadStatus.kind === "error") && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {uploadStatus.kind === "success"
                    ? "Uploaded to Swarm"
                    : "Upload failed"}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {uploadStatus.kind === "success" ? (
                  <>
                    <div>
                      <Label>Manifest hash</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="flex-1 text-xs font-mono bg-muted px-2 py-1.5 rounded break-all">
                          {uploadStatus.reference}
                        </code>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() =>
                            copy(uploadStatus.reference, "hash")
                          }
                          aria-label="Copy hash"
                        >
                          {copied === "hash" ? (
                            <Check className="size-4" />
                          ) : (
                            <Copy className="size-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label>View on your local Bee</Label>
                      <div className="mt-1 flex flex-col gap-2">
                        <a
                          href={uploadStatus.localBzzUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button
                            type="button"
                            variant="default"
                            className="w-full"
                          >
                            <ExternalLink />
                            View page (your Bee)
                          </Button>
                        </a>
                        <a
                          href={uploadStatus.localBzzUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-muted-foreground underline break-all"
                        >
                          {uploadStatus.localBzzUrl}
                        </a>
                      </div>
                    </div>
                    <div>
                      <Label>Make it public via ENS</Label>
                      <div className="mt-1 flex flex-col gap-3">
                        {verifiedEns ? (
                          <>
                            <p className="text-xs text-muted-foreground">
                              Sets the Content Hash record on{" "}
                              <code className="text-[0.65rem]">
                                {verifiedEns}
                              </code>{" "}
                              so the page lives at{" "}
                              <code className="text-[0.65rem]">
                                {verifiedEns}.limo
                              </code>
                              . One Ethereum mainnet tx (you'll pay ETH gas).
                            </p>
                            {isPublishConfirmed ? (
                              <a
                                href={`https://${verifiedEns}.limo/`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Button
                                  type="button"
                                  variant="default"
                                  className="w-full"
                                >
                                  <ExternalLink />
                                  Open {verifiedEns}.limo
                                </Button>
                              </a>
                            ) : (
                              <Button
                                type="button"
                                variant="accent"
                                onClick={handlePublishEns}
                                disabled={!canPublish}
                                className="w-full"
                              >
                                {isPublishing ? (
                                  <>
                                    <Loader2 className="animate-spin" />
                                    Confirm in wallet…
                                  </>
                                ) : isPublishConfirming ? (
                                  <>
                                    <Loader2 className="animate-spin" />
                                    Publishing on-chain…
                                  </>
                                ) : (
                                  <>Publish to {verifiedEns}</>
                                )}
                              </Button>
                            )}
                            {publishTxHash && !isPublishConfirmed && (
                              <a
                                href={`https://etherscan.io/tx/${publishTxHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[0.7rem] text-muted-foreground underline"
                              >
                                View tx on Etherscan
                              </a>
                            )}
                            {publishError && (
                              <p className="text-xs text-destructive break-words">
                                {publishError instanceof Error
                                  ? publishError.message
                                  : String(publishError)}
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Verify an ENS name above to enable one-click
                            publishing. Or paste{" "}
                            <code className="text-[0.65rem]">
                              bzz://{uploadStatus.reference}
                            </code>{" "}
                            into your name's Content Hash record at
                            app.ens.domains.
                          </p>
                        )}

                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-xs font-mono bg-muted px-2 py-1.5 rounded break-all">
                            bzz://{uploadStatus.reference}
                          </code>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() =>
                              copy(
                                `bzz://${uploadStatus.reference}`,
                                "entry"
                              )
                            }
                            aria-label="Copy bzz:// URL"
                          >
                            {copied === "entry" ? (
                              <Check className="size-4" />
                            ) : (
                              <Copy className="size-4" />
                            )}
                          </Button>
                        </div>

                        <p className="text-[0.65rem] text-muted-foreground">
                          Public gateway (gated):{" "}
                          <a
                            href={uploadStatus.bzzUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline break-all"
                          >
                            {uploadStatus.bzzUrl}
                          </a>
                        </p>
                      </div>
                    </div>
                    <div>
                      <Label>In-app route</Label>
                      <div className="mt-1 flex flex-col gap-1">
                        {address && (
                          <Link
                            to={`/u/${address.toLowerCase()}`}
                            className="text-xs text-muted-foreground"
                          >
                            <code className="underline">
                              /u/{address.toLowerCase().slice(0, 10)}…
                            </code>{" "}
                            (redirects to public URL — same gate as above
                            applies)
                          </Link>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-destructive break-words">
                    {uploadStatus.message}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-2">
            <Button type="submit" size="lg" variant="outline">
              Save & download
            </Button>
            <Button
              type="button"
              size="lg"
              onClick={handleUpload}
              disabled={!canUpload}
              title={!selectedId ? "Pick a stamp above first" : undefined}
            >
              {isUploading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Upload />
              )}
              {uploadStatus.kind === "uploading"
                ? "Uploading…"
                : "Save & upload"}
            </Button>
          </div>
        </form>
        </section>

        {/* RIGHT PHONE PREVIEW */}
        <aside className="hidden lg:flex flex-col border-l border-border relative bg-secondary/30">
          <HexBg className="absolute inset-0 text-foreground/[0.06] pointer-events-none" />
          <div className="sticky top-0 h-svh flex flex-col items-center justify-center p-6">
            <PhonePreview
              profile={previewProfile}
              statusLabel={statusLabel}
              statusTone={statusTone}
            />
          </div>
        </aside>
      </div>
    </main>
  )
}
