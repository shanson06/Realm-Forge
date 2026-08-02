/**
 * Central platform surface.
 *
 * Everything that differs between a browser tab, an installed PWA, and a future
 * Capacitor webview lives here so no screen has to sniff the environment itself.
 * No hard-coded production origin appears anywhere in the app: URLs are built
 * from the current origin at call time, which keeps them correct in preview, on
 * the published domain, and inside a `capacitor://` / `file://` webview.
 */

export type PlatformKind = "web" | "ios-web" | "android-web" | "native-webview";

function ua(): string {
  if (typeof navigator === "undefined") return "";
  return navigator.userAgent || "";
}

/** True for iPhone/iPad/iPod, including iPadOS which reports itself as a Mac. */
export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const agent = ua();
  if (/iPad|iPhone|iPod/.test(agent)) return true;
  return agent.includes("Macintosh") && (navigator.maxTouchPoints ?? 0) > 1;
}

/** Safari proper — Chrome and Firefox on iOS cannot Add to Home Screen. */
export function isIOSSafari(): boolean {
  const agent = ua();
  return isIOS() && /Safari/.test(agent) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(agent);
}

/** Running from the home screen (or any installed/standalone surface). */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const iosStandalone = (window.navigator as { standalone?: boolean }).standalone === true;
  return (
    iosStandalone ||
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    window.matchMedia?.("(display-mode: fullscreen)").matches === true ||
    window.matchMedia?.("(display-mode: minimal-ui)").matches === true
  );
}

/** True inside a Capacitor / Cordova webview wrapper. */
export function isNativeWebview(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as { Capacitor?: { isNativePlatform?: () => boolean }; cordova?: unknown };
  if (w.cordova) return true;
  return w.Capacitor?.isNativePlatform?.() === true;
}

export function platformKind(): PlatformKind {
  if (isNativeWebview()) return "native-webview";
  if (isIOS()) return "ios-web";
  if (/Android/.test(ua())) return "android-web";
  return "web";
}

/**
 * Absolute URL for a same-origin path. Uses the live origin so no production
 * host is baked into the bundle.
 */
export function appUrl(path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (typeof window === "undefined") return clean;
  return new URL(clean, window.location.origin).toString();
}

/** Every off-app destination in one place, so a webview can reroute them. */
export const EXTERNAL_LINKS = {
  pwaHelpApple: "https://support.apple.com/guide/iphone/bookmark-a-website-iph42ab2f3a7/ios",
} as const;

/**
 * Opens an external URL. In a native webview this is the single seam to swap in
 * an in-app browser plugin; the web path stays a plain new tab.
 */
export function openExternal(url: string): void {
  if (typeof window === "undefined") return;
  window.open(url, "_blank", "noopener,noreferrer");
}

/**
 * Optional haptic tap. Core gameplay never depends on this — it is a no-op
 * wherever the Vibration API (or a native plugin) is unavailable.
 */
export function haptic(pattern: number | number[] = 10): void {
  if (typeof navigator === "undefined") return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* haptics are decorative; never surface a failure */
  }
}

/** True when the browser reports no connectivity. Optimistic when unknown. */
export function isOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine !== false;
}