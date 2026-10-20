import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Bubble Breaker", template: "%s · Bubble Breaker" },
  description: "Sortez de votre bulle : voyez ce que lit le camp d'en face, et mesurez l'écart.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f6f3ee",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <header className="site-header">
          <div className="wrap">
            <Link href="/" className="brand">
              Bubble<span>·</span>Breaker
            </Link>
            <nav className="nav">
              <Link href="/">Personnalités</Link>
              <Link href="/methode">Méthode</Link>
            </nav>
          </div>
        </header>
        <main className="wrap">{children}</main>
        <footer className="site-footer">
          <div className="wrap">
            Bubble Breaker analyse des articles de presse en accès libre. Il ne couvre pas encore les réseaux sociaux
            ni les messageries (TikTok, Instagram, WhatsApp, Telegram), où circule une grande partie du débat
            politique. Classement automatique par IA : des erreurs sont possibles, signalez-les.
          </div>
        </footer>
      </body>
    </html>
  );
}
