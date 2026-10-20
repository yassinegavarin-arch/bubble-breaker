import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Bubble Breaker", template: "%s · Bubble Breaker" },
  description: "Sortez de votre bulle : voyez ce que lit le camp d'en face, et mesurez l'écart.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1c1917",
};

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <i />
      <i />
    </span>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Outfit:wght@300;400;500;600&display=swap"
        />
      </head>
      <body>
        <header className="site-header">
          <div className="nav-shell">
            <Link href="/" className="brand">
              <BrandMark />
              Bubble <em>Breaker</em>
            </Link>
            <nav className="nav">
              <Link href="/#personnalites">Personnalités</Link>
              <Link href="/#bulle">Bulle de la semaine</Link>
              <Link href="/methode" className="cta">
                La méthode
              </Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
        <footer className="site-footer">
          <div className="wrap">
            <div className="cols">
              <div>
                <Link href="/" className="brand">
                  <BrandMark />
                  Bubble <em>Breaker</em>
                </Link>
                <p>
                  Les algorithmes vous montrent ce qui vous plaît. Bubble Breaker vous montre ce que lit le camp d&apos;en
                  face, classé par une IA selon une méthode publique.
                </p>
              </div>
              <div>
                <p>
                  Sources : presse en accès libre et Google News. Les réseaux sociaux et les messageries (TikTok,
                  Instagram, X, WhatsApp, Telegram) ne sont pas encore couverts.
                </p>
                <p>
                  <Link href="/methode">Lire la méthode</Link> · Portraits : Wikimedia Commons
                </p>
              </div>
            </div>
            <div className="fine">Classement automatique par IA : des erreurs sont possibles, chaque carte peut être signalée.</div>
          </div>
        </footer>
      </body>
    </html>
  );
}
