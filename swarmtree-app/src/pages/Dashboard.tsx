import { useEffect, useState } from "react"
import type { FormEvent } from "react"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import {
  useAccount,
  useEnsName,
  useReadContract,
  useSignMessage,
} from "wagmi"
import { mainnet } from "wagmi/chains"
import { namehash } from "viem"
import {
  Check,
  Copy,
  ExternalLink,
  Loader2,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react"

import { ensRegistryAbi } from "@/abi/ensRegistry"
import { nameWrapperAbi } from "@/abi/nameWrapper"
import { ENS_REGISTRY, NAME_WRAPPER, ZERO_ADDRESS } from "@/lib/addresses"
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
import { uploadProfileFolder } from "@/lib/upload"
import { useStamp } from "@/hooks/useStamp"

type UploadStatus =
  | { kind: "idle" }
  | { kind: "signing" }
  | { kind: "uploading" }
  | { kind: "success"; reference: string; bzzUrl: string }
  | { kind: "error"; message: string }

// Default = Vite dev-server proxy path (see vite.config.ts).
// In dev this hits localhost:3000/api/swarm/bzz which Vite forwards to
// https://beeport.ethswarm.org/bzz server-to-server, bypassing CORS.
// For production deployments, point this at your own proxy origin.
const BEEPORT_BACKEND_URL =
  import.meta.env.VITE_BEEPORT_BACKEND_URL || "/api/swarm"
const BEE_GATEWAY_URL =
  import.meta.env.VITE_BEE_GATEWAY_URL || "https://api.gateway.ethswarm.org"

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

  const { batchId, setBatchId } = useStamp()
  const { signMessageAsync } = useSignMessage()
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
    if (!address || !batchId) return
    setUploadStatus({ kind: "signing" })
    try {
      const html = generateProfileHtml(buildProfile())
      // The wallet popup happens inside uploadProfileFolder via signMessageAsync.
      // Once signed, the network upload starts — flip the status when the
      // signature resolves so the spinner label is accurate.
      const signWithStatus = async (args: { message: string }) => {
        const sig = await signMessageAsync(args)
        setUploadStatus({ kind: "uploading" })
        return sig
      }
      const result = await uploadProfileFolder({
        html,
        batchId,
        address,
        backendUrl: BEEPORT_BACKEND_URL,
        gatewayUrl: BEE_GATEWAY_URL,
        signMessageAsync: signWithStatus,
      })
      setUploadStatus({
        kind: "success",
        reference: result.reference,
        bzzUrl: result.bzzUrl,
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

  const isUploading =
    uploadStatus.kind === "signing" || uploadStatus.kind === "uploading"
  const canUpload = !!batchId && !!address && !isUploading

  const showVerified = verifiedEns && pendingVerify === verifiedEns
  const showFailed =
    pendingVerify && !isVerifying && pendingVerify !== verifiedEns

  return (
    <main className="min-h-svh bg-background">
      <header className="border-b">
        <div className="mx-auto max-w-3xl flex items-center justify-between px-4 py-3">
          <span className="font-semibold">Swarmtree</span>
          <ConnectButton showBalance={false} chainStatus="icon" />
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Edit your profile</h1>
          <p className="text-sm text-muted-foreground">
            <strong>Save &amp; upload</strong> sends your page to Swarm via
            Beeport's open-source proxy.{" "}
            <strong>Save &amp; download</strong> just gives you the{" "}
            <code className="text-xs">index.html</code> for manual upload.
          </p>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Stamp settings</CardTitle>
              <CardDescription>
                Paste your Beeport postage batch ID. You bought this when you
                purchased storage on Beeport — it authorizes uploads from your
                wallet. Stored locally only.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Label htmlFor="batchId">Postage batch ID</Label>
              <Input
                id="batchId"
                placeholder="64-char hex (with or without 0x prefix)"
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                autoComplete="off"
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Don't have one? Buy a stamp at{" "}
                <a
                  href="https://beeport.ethswarm.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline inline-flex items-center gap-1"
                >
                  beeport.ethswarm.org
                  <ExternalLink className="size-3" />
                </a>
                , then copy the batch ID from the History tab.
              </p>
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
                      <Label>Live URL</Label>
                      <a
                        href={uploadStatus.bzzUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-sm underline break-all mt-1"
                      >
                        {uploadStatus.bzzUrl}
                      </a>
                    </div>
                    {address && (
                      <div>
                        <Label>
                          Paste into{" "}
                          <code className="text-xs">src/lib/directory.ts</code>
                        </Label>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="flex-1 text-xs font-mono bg-muted px-2 py-1.5 rounded break-all">
                            "{address.toLowerCase()}": "
                            {uploadStatus.reference}",
                          </code>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() =>
                              copy(
                                `"${address.toLowerCase()}": "${uploadStatus.reference}",`,
                                "entry"
                              )
                            }
                            aria-label="Copy directory entry"
                          >
                            {copied === "entry" ? (
                              <Check className="size-4" />
                            ) : (
                              <Copy className="size-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
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
              title={!batchId ? "Add your batch ID above first" : undefined}
            >
              {isUploading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Upload />
              )}
              {uploadStatus.kind === "signing"
                ? "Sign in wallet…"
                : uploadStatus.kind === "uploading"
                  ? "Uploading…"
                  : "Save & upload"}
            </Button>
          </div>
        </form>
      </div>
    </main>
  )
}
