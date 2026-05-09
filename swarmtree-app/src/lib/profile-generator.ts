import type { Profile } from "@/lib/profile"

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function safeUrl(u: string): string {
  try {
    const url = new URL(u)
    if (["http:", "https:", "mailto:"].includes(url.protocol)) {
      return escapeHtml(u)
    }
  } catch {
    /* fall through */
  }
  return "#"
}

const STYLES = `
  :root {
    --bg: #fafafa;
    --fg: #0a0a0a;
    --fg-muted: #525252;
    --fg-subtle: #a3a3a3;
    --card: #ffffff;
    --card-border: #e5e5e5;
    --card-border-hover: #0a0a0a;
    --shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #0a0a0a;
      --fg: #fafafa;
      --fg-muted: #a3a3a3;
      --fg-subtle: #525252;
      --card: #171717;
      --card-border: #262626;
      --card-border-hover: #fafafa;
      --shadow: 0 1px 2px 0 rgb(0 0 0 / 0.4);
    }
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: var(--bg); color: var(--fg); }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Inter", ui-sans-serif, system-ui, sans-serif;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
    min-height: 100svh;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 2.5rem 1rem 1.5rem;
  }
  main {
    width: 100%;
    max-width: 480px;
    display: flex;
    flex-direction: column;
    gap: 1.75rem;
    text-align: center;
    flex: 1;
  }
  header {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    align-items: center;
    padding-top: 2rem;
  }
  header h1 {
    font-size: 1.875rem;
    font-weight: 600;
    letter-spacing: -0.02em;
  }
  header p.bio { color: var(--fg-muted); max-width: 360px; }
  header p.ens {
    color: var(--fg-subtle);
    font-family: ui-monospace, "SF Mono", Menlo, monospace;
    font-size: 0.75rem;
    margin-top: 0.25rem;
  }
  .links { list-style: none; display: flex; flex-direction: column; gap: 0.625rem; }
  .links a {
    display: block;
    padding: 0.875rem 1rem;
    background: var(--card);
    border: 1px solid var(--card-border);
    border-radius: 0.75rem;
    color: var(--fg);
    text-decoration: none;
    font-weight: 500;
    box-shadow: var(--shadow);
    transition: border-color 0.15s ease, transform 0.15s ease;
  }
  .links a:hover {
    border-color: var(--card-border-hover);
    transform: translateY(-1px);
  }
  footer {
    color: var(--fg-subtle);
    font-size: 0.75rem;
    text-align: center;
    margin-top: 3rem;
  }
  footer a { color: inherit; text-decoration: underline; text-underline-offset: 2px; }
`

const TEMPLATE = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="{{META_DESC}}">
<title>{{TITLE}} · Swarmtree</title>
<style>{{STYLES}}</style>
</head>
<body>
<main>
  <header>
    <h1>{{TITLE}}</h1>
    {{DESC_BLOCK}}
    {{ENS_BLOCK}}
  </header>
  <ul class="links">
{{LINKS}}
  </ul>
</main>
<footer>
  Hosted on Swarm · made with <a href="https://swarmtree.eth.limo" target="_blank" rel="noopener">Swarmtree</a>
</footer>
</body>
</html>
`

export function generateProfileHtml(profile: Profile): string {
  const title = escapeHtml(profile.title || "Untitled")
  const description = profile.description ? escapeHtml(profile.description) : ""
  const ens = profile.ens ? escapeHtml(profile.ens) : ""

  const descBlock = description ? `<p class="bio">${description}</p>` : ""
  const ensBlock = ens ? `<p class="ens">${ens}</p>` : ""

  const linksHtml = profile.links
    .filter((l) => l.label && l.url)
    .map(
      (l) =>
        `    <li><a href="${safeUrl(l.url)}" target="_blank" rel="noopener">${escapeHtml(l.label)}</a></li>`
    )
    .join("\n")

  const values: Record<string, string> = {
    TITLE: title,
    META_DESC: description.replace(/\n/g, " "),
    DESC_BLOCK: descBlock,
    ENS_BLOCK: ensBlock,
    LINKS: linksHtml,
    STYLES,
  }

  // Single-pass replace so user-supplied values can never trigger re-substitution.
  return TEMPLATE.replace(/\{\{(\w+)\}\}/g, (_, key: string) => values[key] ?? "")
}

export function downloadHtml(html: string, filename = "index.html"): void {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
