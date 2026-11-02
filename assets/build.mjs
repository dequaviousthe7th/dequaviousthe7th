// Draws every image in this README, in dark and light. Text is drawn as outlines so it looks
// the same everywhere. The banner uses real contribution data, and a daily workflow reruns this.
// usage: node assets/build.mjs
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, "src");
const USER = "dequaviousthe7th";
const FONTS = JSON.parse(readFileSync(join(SRC, "glyphs.json"), "utf8"));

const THEMES = {
  dark: { bg1: "#0b0b0e", bg2: "#14141a", rim: "#ffffff", rimA: 0.12, fg: "#f5f5f4", fg2: "#b9b9b5", fg3: "#85857f", tile: "#1b1b21", cell: "#ffffff", empty: 0.05, pill: "#ffffff", pillA: 0.07, live: "#3ddc97", shadow: "#000000" },
  light: { bg1: "#ffffff", bg2: "#f4f4ef", rim: "#000000", rimA: 0.1, fg: "#111113", fg2: "#4a4a47", fg3: "#73736d", tile: "#f0f0ea", cell: "#111113", empty: 0.05, pill: "#000000", pillA: 0.05, live: "#0f9d63", shadow: "#000000" },
};

function width(text, size, font, track = 0) {
  const f = FONTS[font];
  return [...text].reduce((sum, ch) => sum + ((f.g[ch]?.a ?? f.upm / 2) / f.upm) * size + track, 0) - track;
}

function text(str, x, y, size, font, fill, { anchor = "start", track = 0, opacity } = {}) {
  const f = FONTS[font];
  const scale = size / f.upm;
  let pen = anchor === "end" ? x - width(str, size, font, track) : anchor === "middle" ? x - width(str, size, font, track) / 2 : x;
  let d = "";
  for (const ch of str) {
    const g = f.g[ch];
    if (!g) { pen += size / 2 + track; continue; }
    if (g.d) d += `<path transform="translate(${pen.toFixed(2)} ${y}) scale(${scale.toFixed(5)} ${(-scale).toFixed(5)})" d="${g.d}"/>`;
    pen += g.a * scale + track;
  }
  return `<g fill="${fill}"${opacity ? ` opacity="${opacity}"` : ""} aria-hidden="true">${d}</g>`;
}

function wrap(str, size, font, max) {
  const lines = [];
  let line = "";
  for (const word of str.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (width(next, size, font) > max && line) { lines.push(line); line = word; } else line = next;
  }
  return [...lines, line];
}

function dataUri(file) {
  const type = { ".png": "image/png", ".svg": "image/svg+xml", ".webp": "image/webp" }[extname(file)];
  return `data:${type};base64,${readFileSync(join(SRC, "logos", file)).toString("base64")}`;
}

function shell(w, h, t, id, title, defs, body, style = "") {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${title}"><title>${title}</title>${style ? `<style>${style}</style>` : ""}<defs><linearGradient id="${id}bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.bg1}"/><stop offset="1" stop-color="${t.bg2}"/></linearGradient><clipPath id="${id}clip"><rect width="${w}" height="${h}" rx="22"/></clipPath>${defs}</defs><g clip-path="url(#${id}clip)"><rect width="${w}" height="${h}" fill="url(#${id}bg)"/>${body}</g><rect x=".75" y=".75" width="${w - 1.5}" height="${h - 1.5}" rx="21.5" fill="none" stroke="${t.rim}" stroke-opacity="${t.rimA}" stroke-width="1.5"/></svg>`;
}

const PULSE_CSS = `.pulse{transform-box:fill-box;transform-origin:center;animation:pulse 2.4s ease-out infinite}@keyframes pulse{0%{transform:scale(1);opacity:.7}70%,100%{transform:scale(3.2);opacity:0}}@media (prefers-reduced-motion:reduce){.pulse{display:none}}`;

async function contributions() {
  const cache = join(SRC, "contributions.json");
  try {
    const res = await fetch(`https://github-contributions-api.jogruber.de/v4/${USER}?y=last`);
    if (!res.ok) throw new Error(String(res.status));
    const days = (await res.json()).contributions;
    if (!Array.isArray(days) || !days.length) throw new Error("empty");
    writeFileSync(cache, JSON.stringify(days));
    return days;
  } catch (err) {
    if (!existsSync(cache)) throw err;
    return JSON.parse(readFileSync(cache, "utf8"));
  }
}

function banner(t, days) {
  const W = 1280, H = 412, CELL = 18, GAP = 4, X0 = 56, Y0 = 226;
  const recent = days.slice(-371);
  const total = recent.reduce((sum, d) => sum + d.count, 0);
  const pad = new Date(`${recent[0].date}T12:00:00Z`).getUTCDay();
  const nonzero = recent.map((d) => d.count).filter(Boolean).sort((a, b) => a - b);
  const q = (p) => nonzero[Math.floor(nonzero.length * p)] ?? 1;
  const level = (c) => (c === 0 ? 0 : c <= q(0.3) ? 1 : c <= q(0.6) ? 2 : c <= q(0.85) ? 3 : 4);
  const alpha = [t.empty, 0.2, 0.42, 0.68, 0.95];
  let cells = "", mask = "";
  recent.forEach((d, i) => {
    const n = i + pad;
    const x = X0 + Math.floor(n / 7) * (CELL + GAP);
    const y = Y0 + (n % 7) * (CELL + GAP);
    if (x + CELL > W - 40) return;
    const l = level(d.count);
    cells += `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="4" fill="${t.cell}" fill-opacity="${alpha[l]}"/>`;
    mask += `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="4" fill="#fff" fill-opacity="${l === 0 ? 0.15 : 0.45 + l * 0.14}"/>`;
  });
  const defs = `<linearGradient id="bband" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${t.live}" stop-opacity="0"/><stop offset=".5" stop-color="${t.live}"/><stop offset="1" stop-color="${t.live}" stop-opacity="0"/></linearGradient><mask id="bmask">${mask}</mask><radialGradient id="bhalo" cx="1120" cy="-20" r="520" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${t.live}" stop-opacity=".13"/><stop offset="1" stop-color="${t.live}" stop-opacity="0"/></radialGradient>`;
  const style = `${PULSE_CSS}.sweep{animation:sweep 6.5s cubic-bezier(.45,.05,.55,.95) infinite}@keyframes sweep{0%{transform:translateX(-340px)}70%,100%{transform:translateX(1320px)}}@media (prefers-reduced-motion:reduce){.sweep{display:none}}`;
  const body = `<rect width="${W}" height="${H}" fill="url(#bhalo)"/>
<circle class="pulse" cx="62" cy="62" r="5" fill="${t.live}"/><circle cx="62" cy="62" r="5" fill="${t.live}"/>
${text("SHIPPING FROM BEIRUT", 78, 67, 14, "mono", t.fg3, { track: 2 })}
${text("Khaled Jamal", 54, 142, 76, "black", t.fg, { track: -2.6 })}
${text("Software engineer. Founder of Helm.", 56, 186, 26, "reg", t.fg2, { track: -0.3 })}
${text(total.toLocaleString("en-US"), W - 56, 112, 52, "black", t.fg, { anchor: "end", track: -1.6 })}
${text("COMMITS, LAST 12 MONTHS", W - 56, 138, 13, "mono", t.fg3, { anchor: "end", track: 1.6 })}
${text("10+", W - 56, 182, 26, "bold", t.fg, { anchor: "end" })}
${text("BUSINESSES RUNNING ON HELM", W - 56, 204, 13, "mono", t.fg3, { anchor: "end", track: 1.6 })}
${cells}<g mask="url(#bmask)"><rect class="sweep" x="0" y="${Y0 - 4}" width="340" height="${7 * (CELL + GAP) + 8}" fill="url(#bband)"/></g>`;
  return shell(W, H, t, "b", `Khaled Jamal, software engineer and founder of Helm. ${total.toLocaleString("en-US")} commits in the last 12 months.`, defs, body, style);
}

function pill(label, x, y, t, live) {
  const w = width(label, 12, "mono", 1.2) + (live ? 40 : 26);
  const bx = x - w;
  return `<rect x="${bx}" y="${y}" width="${w}" height="26" rx="13" fill="${t.pill}" fill-opacity="${t.pillA}"/>${live ? `<circle class="pulse" cx="${bx + 15}" cy="${y + 13}" r="3.5" fill="${t.live}"/><circle cx="${bx + 15}" cy="${y + 13}" r="3.5" fill="${t.live}"/>` : ""}${text(label, bx + (live ? 27 : 13), y + 17.5, 12, "mono", live ? t.fg : t.fg2, { track: 1.2 })}`;
}

function logo(p, t, x, y, size) {
  const file = t === THEMES.light && p.logoLight ? p.logoLight : p.logo;
  return `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${size * 0.26}" fill="${t.tile}"/><image x="${x + size * 0.14}" y="${y + size * 0.14}" width="${size * 0.72}" height="${size * 0.72}" href="${dataUri(file)}" preserveAspectRatio="xMidYMid meet"/>`;
}

function halo(id, cx, cy, r, color, a = 0.2) {
  return `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${color}" stop-opacity="${a}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`;
}

function helmCard(p, t) {
  const W = 1280, H = 318;
  const lines = wrap(p.body, 24, "reg", 1040);
  const stats = p.stats.map(([big, small], i) => {
    const x = 44 + i * 298;
    return `${text(big, x, 252, 38, "black", t.fg, { track: -1 })}${text(small, x, 280, 13, "mono", t.fg3, { track: 1 })}`;
  }).join("");
  const body = `<rect width="${W}" height="${H}" fill="url(#hglow)"/>${logo(p, t, 44, 40, 68)}
${text(p.name, 130, 90, 50, "black", t.fg, { track: -1.6 })}${pill(p.status, W - 44, 44, t, true)}
${lines.map((l, i) => text(l, 44, 152 + i * 34, 24, "reg", t.fg2, { track: -0.2 })).join("")}
<rect x="44" y="212" width="${W - 88}" height="1" fill="${t.rim}" fill-opacity="${t.rimA}"/>${stats}`;
  return shell(W, H, t, "h", `${p.name}: ${p.body}`, halo("hglow", 1150, -30, 560, p.accent, 0.24), body, PULSE_CSS);
}

function card(p, t) {
  const W = 632, H = 250;
  const lines = wrap(p.body, 19, "reg", W - 72).slice(0, 3);
  const body = `<rect width="${W}" height="${H}" fill="url(#cglow)"/>${logo(p, t, 32, 30, 52)}
${text(p.name, 98, 66, 29, "black", t.fg, { track: -0.8 })}${pill(p.status, W - 32, 34, t, p.live)}
${lines.map((l, i) => text(l, 34, 118 + i * 28, 19, "reg", t.fg2)).join("")}
${text(p.tags.join("  ·  "), 34, 218, 13, "mono", t.fg3, { track: 0.5 })}`;
  return shell(W, H, t, "c", `${p.name}: ${p.body}`, halo("cglow", W - 40, -20, 340, p.accent, 0.22), body, p.live ? PULSE_CSS : "");
}

function stack(groups, t) {
  const W = 1280, COLS = 3, CW = 414, CH = 122, GX = 19, GY = 19, X0 = 0;
  const rows = Math.ceil(groups.length / COLS);
  const H = rows * CH + (rows - 1) * GY;
  const cards = groups.map((g, i) => {
    const x = X0 + (i % COLS) * (CW + GX);
    const y = Math.floor(i / COLS) * (CH + GY);
    const tiles = g.logos.map((file, j) => `<image x="${x + 24 + j * 72}" y="${y + 52}" width="48" height="48" href="${dataUri(file)}"/>`).join("");
    return `<rect x="${x + 0.75}" y="${y + 0.75}" width="${CW - 1.5}" height="${CH - 1.5}" rx="17" fill="${t.bg1}" stroke="${t.rim}" stroke-opacity="${t.rimA}" stroke-width="1.5"/>${text(g.label.toUpperCase(), x + 24, y + 34, 13, "mono", t.fg3, { track: 2 })}${tiles}`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Stack"><title>Stack: ${groups.map((g) => g.label).join(", ")}</title>${cards}</svg>`;
}

function divider(t) {
  const shades = [0.08, 0.2, 0.42, 0.68, 0.95, 0.68, 0.42, 0.2, 0.08];
  const cells = shades.map((a, i) => `<rect x="${640 - 54 + i * 12}" y="9" width="10" height="10" rx="2.5" fill="${i === 4 ? t.live : t.cell}" fill-opacity="${a}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="28" viewBox="0 0 1280 28" role="presentation"><defs><linearGradient id="d" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${t.cell}" stop-opacity="0"/><stop offset="1" stop-color="${t.cell}" stop-opacity=".16"/></linearGradient><linearGradient id="d2" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="${t.cell}" stop-opacity="0"/><stop offset="1" stop-color="${t.cell}" stop-opacity=".16"/></linearGradient></defs><rect x="60" y="13.5" width="510" height="1" fill="url(#d)"/><rect x="710" y="13.5" width="510" height="1" fill="url(#d2)"/>${cells}</svg>`;
}

const HELM = {
  slug: "helm", name: "Helm", logo: "helm-full.png", logoLight: "helm-light.png", accent: "#e2a050", status: "LIVE",
  body: "The software a small business runs on. Its website, bookings, customers, loyalty and courses in one dashboard, on its own domain, with no developer needed.",
  stats: [["10+", "PAYING BUSINESSES"], ["23", "MODULES, YOU SEE YOURS"], ["2 months", "IDEA TO FIRST CLIENT"], ["EN + AR", "ON EVERY SCREEN"]],
};

const CARDS = [
  { slug: "bifrost", name: "Bifröst", logo: "bifrost-full.png", logoLight: "bifrost-light.png", accent: "#7f8cff", status: "PRIVATE", body: "My own team of AI coding agents. The first version stalled, so I rebuilt it from scratch around exactly what went wrong.", tags: ["TypeScript", "Claude Agent SDK", "MCP"] },
  { slug: "pulse", name: "Pulse", logo: "pulse-mark.svg", accent: "#2dd4bf", status: "IN STUDY", body: "Automated trading on Solana, built evidence first. Hard limits, no market manipulation, and only code trades.", tags: ["Rust", "TypeScript", "Python", "Solana"] },
  { slug: "soltools", name: "SolTools", logo: "soltools-full.png", accent: "#9945ff", status: "LIVE", live: true, body: "Free, verifiable Solana tools. Reclaim rent, scan tokens, X-ray wallets, burn or lock, and generate vanity addresses.", tags: ["TypeScript", "Next.js", "WASM", "Solana"] },
  { slug: "file-converter", name: "File Converter Pro", logo: "fileconverter.png", accent: "#34cfa0", status: "OPEN SOURCE", body: "A desktop converter with 158 local conversion paths. No uploads, no telemetry, and nothing else to install.", tags: ["Rust", "Tauri 2", "TypeScript"] },
  { slug: "trencher", name: "The Trencher", logo: "trencher.svg", accent: "#1fce63", status: "EARLY ACCESS", live: true, body: "A satirical roguelike about the Solana trenches. Twelve nights a run, with every sprite and sound made in code.", tags: ["JavaScript", "Cloudflare", "Unity"] },
  { slug: "gossima", name: "Gossima", logo: "gossima-full.png", accent: "#f0783c", status: "COMING SOON", body: "You play, it keeps score. A spare phone on the back glass calls every point and cuts your highlights.", tags: ["Swift", "Computer vision", "PostgreSQL"] },
  { slug: "croffee", name: "Croffee", logo: "croffee-full.png", accent: "#ec4899", status: "CLIENT", live: true, body: "A croffle and specialty coffee spot in Beirut. Weekly picks, a full menu and cart, WhatsApp ordering and Toters delivery.", tags: ["Next.js", "TypeScript", "Helm"] },
  { slug: "kaged", name: "Kaged Production", logo: "kaged.png", accent: "#ef6a3f", status: "CLIENT", live: true, body: "A creative and film production team in Beirut. Built to show the work and get shoots booked.", tags: ["Next.js", "Motion", "Helm"] },
];

const STACK = [
  { label: "Languages", logos: ["ts.svg", "js.svg", "rust.svg", "py.svg", "swift.svg"] },
  { label: "Frontend", logos: ["react.svg", "nextjs.svg", "tailwind.svg", "vite.svg", "framer.svg"] },
  { label: "Backend", logos: ["nodejs.svg", "express.svg", "prisma.svg", "stripe.svg", "socketdotio.svg"] },
  { label: "AI", logos: ["claude.svg", "anthropic.svg", "modelcontextprotocol.svg", "chatgpt.svg", "deepseek.svg"] },
  { label: "Data", logos: ["postgres.svg", "redis.svg", "sqlite.svg", "supabase.svg", "bigquery.svg"] },
  { label: "Infrastructure", logos: ["cloudflare.svg", "linux.svg", "docker.svg", "nginx.svg", "githubactions.svg"] },
  { label: "Blockchain", logos: ["solana.svg", "jito.png", "grpc.png", "solidity.svg"] },
  { label: "Apps and games", logos: ["reactnative.svg", "expo.svg", "tauri.svg", "electron.svg", "unity.svg"] },
  { label: "Tools", logos: ["git.svg", "figma.svg", "playwright.svg", "vitest.svg", "resend.svg"] },
];

const OUT = join(HERE, "img");
mkdirSync(OUT, { recursive: true });
const days = await contributions();
for (const [name, t] of Object.entries(THEMES)) {
  writeFileSync(join(OUT, `banner-${name}.svg`), banner(t, days));
  writeFileSync(join(OUT, `helm-${name}.svg`), helmCard(HELM, t));
  for (const p of CARDS) writeFileSync(join(OUT, `${p.slug}-${name}.svg`), card(p, t));
  writeFileSync(join(OUT, `stack-${name}.svg`), stack(STACK, t));
  writeFileSync(join(OUT, `divider-${name}.svg`), divider(t));
}
console.log("drew", days.length, "days");
