import type { Profile } from "@/lib/profile"

// Pulls the structured Profile back out of a standalone Swarmtree HTML page.
// First tries the embedded JSON block (added after the v2 update); falls back
// to scraping the DOM structure for older uploads. Returns null if neither
// works (non-Swarmtree HTML or unrecognizable shape).
export function parseProfileHtml(html: string): Profile | null {
  return parseFromJsonBlock(html) ?? parseFromDom(html)
}

function parseFromJsonBlock(html: string): Profile | null {
  const match =
    /<script[^>]*id=["']swarmtree-data["'][^>]*>([\s\S]*?)<\/script>/i.exec(
      html
    )
  if (!match) return null
  try {
    const raw = match[1].replace(/\\u003c/g, "<")
    const parsed = JSON.parse(raw) as Partial<Profile>
    if (!parsed || typeof parsed !== "object") return null
    if (typeof parsed.title !== "string") return null
    if (!Array.isArray(parsed.links)) return null
    return {
      version: 1,
      address: parsed.address,
      ens: parsed.ens ?? null,
      title: parsed.title,
      description: parsed.description ?? "",
      links: parsed.links
        .filter(
          (l): l is { label: string; url: string } =>
            !!l &&
            typeof l === "object" &&
            typeof (l as { label: unknown }).label === "string" &&
            typeof (l as { url: unknown }).url === "string"
        )
        .map((l) => ({ label: l.label, url: l.url })),
      updatedAt: parsed.updatedAt,
    }
  } catch {
    return null
  }
}

// Scrape Swarmtree's standard template (h1 title, p.bio, p.ens, ul.links a).
// This is the migration path for older uploads that predate the JSON block.
function parseFromDom(html: string): Profile | null {
  if (typeof DOMParser === "undefined") return null
  let doc: Document
  try {
    doc = new DOMParser().parseFromString(html, "text/html")
  } catch {
    return null
  }
  const title = doc.querySelector("main header h1")?.textContent?.trim()
  if (!title) return null

  const description =
    doc.querySelector("main header p.bio")?.textContent?.trim() ?? ""
  const ens =
    doc.querySelector("main header p.ens")?.textContent?.trim() || null

  const links = Array.from(
    doc.querySelectorAll<HTMLAnchorElement>("main ul.links a")
  )
    .map((a) => ({
      label: a.textContent?.trim() ?? "",
      url: a.getAttribute("href") ?? "",
    }))
    .filter((l) => l.label && l.url && l.url !== "#")

  return {
    version: 1,
    ens,
    title,
    description,
    links,
  }
}
