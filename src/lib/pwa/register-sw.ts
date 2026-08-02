/**
 * The only place a service worker is ever registered.
 *
 * A service worker is browser-held state: once registered it can keep serving a
 * stale shell long after the code changed. It must therefore never run in the
 * Lovable editor preview, in an iframe, or in dev — in any of those contexts we
 * actively unregister a previously installed worker instead.
 */

const SW_URL = "/sw.js";

export type UpdateHandler = (activate: () => Promise<void>) => void;

function inIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function isPreviewHost(hostname: string): boolean {
  return (
    hostname.startsWith("id-preview--") ||
    hostname.startsWith("preview--") ||
    hostname === "lovableproject.com" ||
    hostname.endsWith(".lovableproject.com") ||
    hostname === "lovableproject-dev.com" ||
    hostname.endsWith(".lovableproject-dev.com") ||
    hostname === "beta.lovable.dev" ||
    hostname.endsWith(".beta.lovable.dev")
  );
}

/** Kill switch and preview guard: strip any worker we previously installed. */
async function unregisterOurWorkers(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.allSettled(
    registrations
      .filter((reg) => {
        const url = reg.active?.scriptURL ?? reg.installing?.scriptURL ?? reg.waiting?.scriptURL;
        return typeof url === "string" && new URL(url, location.origin).pathname === SW_URL;
      })
      .map((reg) => reg.unregister()),
  );
}

export function shouldRegister(): boolean {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return false;
  if (!import.meta.env.PROD) return false;
  if (inIframe()) return false;
  if (isPreviewHost(window.location.hostname)) return false;
  if (
    new URLSearchParams(window.location.search).has("sw") &&
    new URLSearchParams(window.location.search).get("sw") === "off"
  )
    return false;
  return true;
}

/**
 * Registers the generated worker and reports a waiting update through
 * `onUpdate`. It never reloads on its own: an active match must not be replaced
 * out from under the player, so activation is the caller's decision.
 */
export async function registerServiceWorker(onUpdate: UpdateHandler): Promise<void> {
  if (!shouldRegister()) {
    await unregisterOurWorkers().catch(() => undefined);
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register(SW_URL, { scope: "/" });

    const activate = async () => {
      const waiting = registration.waiting;
      if (!waiting) {
        window.location.reload();
        return;
      }
      // Reload once the new worker takes control, so the page and its cached
      // shell always come from the same build.
      navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload(), {
        once: true,
      });
      waiting.postMessage({ type: "SKIP_WAITING" });
    };

    if (registration.waiting && navigator.serviceWorker.controller) {
      onUpdate(activate);
    }

    registration.addEventListener("updatefound", () => {
      const installing = registration.installing;
      if (!installing) return;
      installing.addEventListener("statechange", () => {
        // A worker that installs with no existing controller is the very first
        // install, not an update — there is nothing for the player to confirm.
        if (installing.state === "installed" && navigator.serviceWorker.controller) {
          onUpdate(activate);
        }
      });
    });
  } catch (error) {
    // Offline play is an enhancement; a failed registration must not break boot.
    console.warn("Realmforge: service worker registration failed", error);
  }
}
