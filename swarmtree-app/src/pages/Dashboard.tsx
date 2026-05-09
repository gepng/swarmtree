import { useState } from "react"
import type { FormEvent } from "react"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

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

  function handleSave(e: FormEvent) {
    e.preventDefault()
    const profile = {
      title,
      description,
      links: links.map((l) => ({ label: l.label, url: l.url })),
    }
    console.log("Profile (preview only):", profile)
    alert("Preview only — saves shipping in v2. Logged to console.")
  }

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
            Preview only — changes log to the console for now.
          </p>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-6">
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

          <div className="flex justify-end">
            <Button type="submit" size="lg">
              Save (preview only)
            </Button>
          </div>
        </form>
      </div>
    </main>
  )
}
