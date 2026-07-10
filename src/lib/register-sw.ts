// Guarded service worker registration wrapper.
// Follows Lovable PWA skill: never register in dev / preview / iframes,
// supports ?sw=off kill switch, and cleans up matching stale registrations
// when refused.

const SW_PATH = "/sw.js";

function isRefusedContext(): boolean {
  if (!import.meta.env.PROD) return true;
  if (typeof window === "undefined") return true;
  try {
    if (window.top !== window.self) return true;
  } catch {
    return true;
  }
  const { hostname, search } = window.location;
  if (search.includes("sw=off")) return true;
  if (hostname.startsWith("id-preview--") || hostname.startsWith("preview--")) return true;
  if (hostname === "lovableproject.com" || hostname.endsWith(".lovableproject.com")) return true;
  if (hostname === "lovableproject-dev.com" || hostname.endsWith(".lovableproject-dev.com")) return true;
  if (hostname === "beta.lovable.dev" || hostname.endsWith(".beta.lovable.dev")) return true;
  return false;
}

async function unregisterMatching() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.allSettled(
      regs
        .filter((r) => {
          const url = r.active?.scriptURL || r.waiting?.scriptURL || r.installing?.scriptURL || "";
          return url.endsWith(SW_PATH);
        })
        .map((r) => r.unregister()),
    );
  } catch {
    /* noop */
  }
}

export function registerServiceWorker() {
  if (typeof window === "undefined") return;
  if (isRefusedContext()) {
    void unregisterMatching();
    return;
  }
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    void (async () => {
      try {
        const { Workbox } = await import("workbox-window");
        const wb = new Workbox(SW_PATH, { scope: "/" });
        wb.addEventListener("waiting", () => {
          void wb.messageSkipWaiting();
        });
        wb.addEventListener("controlling", () => {
          window.location.reload();
        });
        await wb.register();
      } catch (err) {
        console.warn("[sw] registration failed", err);
      }
    })();
  });
}
