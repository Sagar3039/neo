/**
 * adblock-sw.js — Browser-side ad & tracker blocker
 *
 * Mirrors the BLOCKED_HOSTS list from index.js (Electron main process).
 * Runs as a Service Worker so it intercepts ALL fetch requests from the
 * page + any same-origin iframes (cross-origin iframes handled via
 * declarativeNetRequest on Chrome extensions, but SW covers same-origin
 * subresource requests that the player sources trigger via their scripts).
 *
 * Stats are broadcast to the React app via BroadcastChannel('adblock-stats').
 */

const BLOCKED_DOMAINS = [
  "www.google-analytics.com",
  "analytics.google.com",
  "googletagmanager.com",
  "www.googletagmanager.com",
  "googletagservices.com",
  "doubleclick.net",
  "adservice.google.com",
  "adservice.google.de",
  "pagead2.googlesyndication.com",
  "stats.g.doubleclick.net",
  "cdn.adx1.com",
  "intelligenceadx.com",
  "adsco.re",
  "mc.yandex.com",
  "mc.yandex.ru",
  "bvtpk.com",
  "my.rtmark.net",
  "b7510.com",
  "gt.unbrownunflat.com",
  "im.malocacomals.com",
  "users.videasy.net",
  "nf.sixmossin.com",
  "realizationnewestfangs.com",
  "acscdn.com",
  "lt.taloseempest.com",
  "pl26708123.profitableratecpm.com",
  "preferencenail.com",
  "protrafficinspector.com",
  "s10.histats.com",
  "weirdopt.com",
  "static.cloudflareinsights.com",
  "kettledroopingcontinuation.com",
  "wayfarerorthodox.com",
  "woxaglasuy.net",
  "adeptspiritual.com",
  "www.calculating-laugh.com",
  "amavhxdlofklxjg.xyz",
  "usrpubtrk.com",
  "adexchangeclear.com",
  "rzjzjnavztycv.online",
  "tmstr4.cloudnestra.com",
  "tmstr4.neonhorizonworkshops.com",
  // Common general ad/tracker domains not in Electron list
  "ad.doubleclick.net",
  "securepubads.g.doubleclick.net",
  "tpc.googlesyndication.com",
  "adsystem.com",
  "amazon-adsystem.com",
  "advertising.com",
  "taboola.com",
  "outbrain.com",
  "scorecardresearch.com",
  "pixel.quantserve.com",
  "quantserve.com",
  "moatads.com",
  "adsrvr.org",
  "rubiconproject.com",
  "openx.net",
  "casalemedia.com",
  "pubmatic.com",
  "contextweb.com",
  "lijit.com",
  "adnxs.com",
  "criteo.com",
  "criteo.net",
  "hotjar.com",
  "mixpanel.com",
  "segment.io",
  "segment.com",
  "fullstory.com",
  "mouseflow.com",
  "clarity.ms",
];

// Build a Set of domains + wildcard-subdomain entries for O(1) lookup
const BLOCKED_SET = new Set(BLOCKED_DOMAINS);

// Wildcard domains: any subdomain of these is also blocked
const WILDCARD_DOMAINS = [
  "doubleclick.net",
  "googlesyndication.com",
  "googletagservices.com",
  "googletagmanager.com",
  "moatads.com",
  "rubiconproject.com",
  "criteo.com",
  "criteo.net",
];

function isBlocked(url) {
  let hostname;
  try {
    hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return false;
  }

  if (BLOCKED_SET.has(hostname)) return true;

  // Check wildcard parents
  for (const parent of WILDCARD_DOMAINS) {
    if (hostname === parent || hostname.endsWith("." + parent)) return true;
  }

  return false;
}

// BroadcastChannel to send stats back to the React app
let statsChannel;
try {
  statsChannel = new BroadcastChannel("adblock-stats");
} catch {
  statsChannel = null;
}

// Debounced batch sender — avoids flooding the channel during ad bursts
let pendingBatch = null;
let batchTimer = null;

function recordBlocked(url) {
  let domain;
  try {
    domain = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    domain = "unknown";
  }

  if (!pendingBatch) pendingBatch = { total: 0, domains: {} };
  pendingBatch.total++;
  pendingBatch.domains[domain] = (pendingBatch.domains[domain] || 0) + 1;

  if (batchTimer) clearTimeout(batchTimer);
  batchTimer = setTimeout(() => {
    batchTimer = null;
    if (statsChannel && pendingBatch) {
      try {
        statsChannel.postMessage(pendingBatch);
      } catch {}
    }
    pendingBatch = null;
  }, 250);
}

// ── Service Worker lifecycle ──────────────────────────────────────────────────

self.addEventListener("install", () => {
  // Skip waiting so the new SW activates immediately
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Take control of all clients without waiting for a reload
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const { url } = event.request;

  if (isBlocked(url)) {
    recordBlocked(url);
    // Respond with an empty 200 so the page doesn't get a network error
    // that could crash the player's error handler
    event.respondWith(new Response("", { status: 200 }));
    return;
  }

  // Pass everything else through unchanged
  // (don't call event.respondWith — browser handles it natively)
});
