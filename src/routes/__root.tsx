import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { DiagnosticsPanel } from "@/components/dev/DiagnosticsPanel";
import { OfflineIndicator } from "@/components/pwa/OfflineIndicator";
import { UpdatePrompt } from "@/components/pwa/UpdatePrompt";

/**
 * iOS uses <link rel="apple-touch-startup-image"> for the launch screen, matched
 * by exact device pixel dimensions, so every supported size is listed. Each file
 * is the Realmforge crest on the app background colour.
 */
/** [device pixel width, device pixel height, devicePixelRatio] */
const APPLE_LAUNCH_SIZES = [
  [1179, 2556, 3], // iPhone 15 / 14 Pro
  [1290, 2796, 3], // iPhone 15 / 14 Pro Max
  [1170, 2532, 3], // iPhone 13 / 12
  [1284, 2778, 3], // iPhone 13 / 12 Pro Max
  [1125, 2436, 3], // iPhone X / XS / 11 Pro
  [1620, 2160, 2], // iPad 10.2"
  [1668, 2388, 2], // iPad Pro 11"
  [2048, 2732, 2], // iPad Pro 12.9"
] as const;

const APPLE_LAUNCH_IMAGES = APPLE_LAUNCH_SIZES.flatMap(([w, h, ratio]) => {
  const cssW = Math.round(w / ratio);
  const cssH = Math.round(h / ratio);
  return [
    {
      rel: "apple-touch-startup-image",
      href: `/splash/launch-${w}x${h}.png`,
      media: `(device-width: ${cssW}px) and (device-height: ${cssH}px) and (-webkit-device-pixel-ratio: ${ratio}) and (orientation: portrait)`,
    },
    {
      rel: "apple-touch-startup-image",
      href: `/splash/launch-${h}x${w}.png`,
      media: `(device-width: ${cssW}px) and (device-height: ${cssH}px) and (-webkit-device-pixel-ratio: ${ratio}) and (orientation: landscape)`,
    },
  ];
});

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Realmforge" },
      {
        name: "description",
        content:
          "Realmforge: a family-friendly fantasy strategy card game with cooperative and competitive QuickPlay modes.",
      },
      { name: "author", content: "Realmforge" },
      { property: "og:title", content: "Realmforge" },
      {
        property: "og:description",
        content:
          "Realmforge: a family-friendly fantasy strategy card game with cooperative and competitive QuickPlay modes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@Lovable" },
      // Installable web app metadata. Apple ignores the manifest for these.
      { name: "theme-color", content: "#0b1024" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Realmforge" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Manrope:wght@400;500;600;700&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/icons/apple-touch-icon.png", sizes: "180x180" },
      ...APPLE_LAUNCH_IMAGES,
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <OfflineIndicator />
      <UpdatePrompt />
      <DiagnosticsPanel />
    </QueryClientProvider>
  );
}
