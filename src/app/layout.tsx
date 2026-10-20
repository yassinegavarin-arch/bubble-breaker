import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { HeaderSearch } from "@/components/client";
// Polices hébergées par l'application (aucun appel à Google Fonts depuis le navigateur des visiteurs).
import "@fontsource/cormorant-garamond/400.css";
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/600.css";
import "@fontsource/cormorant-garamond/400-italic.css";
import "@fontsource/cormorant-garamond/500-italic.css";
import "@fontsource/outfit/300.css";
import "@fontsource/outfit/400.css";
import "@fontsource/outfit/500.css";
import "@fontsource/outfit/600.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Bubble Breaker", template: "%s · Bubble Breaker" },
  description: "Sortez de votre bulle : voyez ce que lit le camp d'en face, et mesurez l'écart.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#faf8f5",
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
      <body>
        <header className="site-header">
          <div className="nav-shell">
            <Link href="/" className="brand">
              <BrandMark />
              Bubble <em>Breaker</em>
            </Link>
            <nav className="nav">
              <Link href="/#personnalites">Personnalités</Link>
              <Link href="/#bulle">Bulle du moment</Link>
              <HeaderSearch />
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
                <p className="footer-links">
                  <Link href="/methode">La méthode</Link>
                  <Link href="/mentions-legales">Mentions légales</Link>
                  <Link href="/confidentialite">Confidentialité</Link>
                  <Link href="/conditions">Conditions d&apos;utilisation</Link>
                  <Link href="/credits">Crédits photos</Link>
                </p>
              </div>
            </div>
            <div className="fine">Site non commercial, sans cookie ni publicité. Classement automatique par IA : des erreurs sont possibles, chaque carte peut être signalée.</div>
          </div>
        </footer>
      </body>
    </html>
  );
}
