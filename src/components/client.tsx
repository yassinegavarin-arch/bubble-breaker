"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

/** Fait apparaître son contenu en fondu quand il entre à l'écran. */
export function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("in");
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal ${className}`} style={{ ["--delay" as string]: `${delay}ms` }}>
      {children}
    </div>
  );
}

/** Compteur animé de 0 à la valeur. */
export function CountUp({ value, duration = 1600 }: { value: number; duration?: number }) {
  const [n, setN] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (t: number) => {
        const k = Math.min(1, (t - start) / duration);
        setN(Math.round(value * (1 - Math.pow(1 - k, 4))));
        if (k < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, duration]);
  return <span ref={ref}>{n.toLocaleString("fr-FR")}</span>;
}

const TINTS = ["rgba(31,138,91,0.28)", "rgba(217,72,28,0.28)", "rgba(192,138,43,0.32)", "rgba(155,27,27,0.22)"];

/** Bulles qui montent dans le héros ; un clic les fait éclater. */
export function Bubbles({ count = 14 }: { count?: number }) {
  // Valeurs fixes (pseudo-aléatoires déterministes) pour éviter tout écart entre serveur et navigateur.
  const bubbles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const r = (k: number) => {
          const x = Math.sin((i + 1) * 9301 + k * 49297) * 233280;
          return x - Math.floor(x);
        };
        return {
          size: 40 + Math.round(r(1) * 120),
          left: Math.round(r(2) * 100),
          dur: 14 + Math.round(r(3) * 16),
          delay: -Math.round(r(4) * 30),
          sway: Math.round((r(5) - 0.5) * 120),
          tint: TINTS[i % TINTS.length],
        };
      }),
    [count],
  );
  const [popped, setPopped] = useState<Set<number>>(new Set());

  function pop(i: number) {
    setPopped((s) => new Set(s).add(i));
    // La bulle réapparaît plus tard, comme une nouvelle.
    setTimeout(
      () =>
        setPopped((s) => {
          const next = new Set(s);
          next.delete(i);
          return next;
        }),
      2500,
    );
  }

  return (
    <div className="bubbles" aria-hidden="true">
      {bubbles.map((b, i) => (
        <span
          key={i}
          className={`bubble${popped.has(i) ? " popped" : ""}`}
          onClick={() => pop(i)}
          style={{
            width: b.size,
            height: b.size,
            left: `${b.left}%`,
            ["--dur" as string]: `${b.dur}s`,
            ["--delay" as string]: `${b.delay}s`,
            ["--sway" as string]: `${b.sway}px`,
            ["--tint" as string]: b.tint,
          }}
        />
      ))}
    </div>
  );
}

export interface FlipCardData {
  slug: string;
  name: string;
  role: string;
  country: string;
  photo: string | null;
  credit: string | null;
  initials: string;
  favorable: number;
  neutre: number;
  defavorable: number;
  gap: number | null;
  featured?: boolean;
}

function pct(part: number, total: number) {
  return total ? `${(part / total) * 100}%` : "0%";
}

/** Carte retournable : recto = portrait et totaux, verso = choix +, − ou =. */
export function FlipCard({ d, delay = 0 }: { d: FlipCardData; delay?: number }) {
  const [flipped, setFlipped] = useState(false);
  const total = d.favorable + d.neutre + d.defavorable;
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <Reveal delay={delay}>
      <div className={`flip${flipped ? " flipped" : ""}${d.featured ? " featured" : ""}`}>
        <div
          className="flip-inner"
          role="button"
          tabIndex={0}
          aria-pressed={flipped}
          aria-label={`${d.name} : retourner la carte`}
          onClick={() => setFlipped((f) => !f)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setFlipped((f) => !f);
            }
          }}
        >
          {/* Recto */}
          <div className="face front">
            {d.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={d.photo} alt={d.name} loading="lazy" />
            ) : (
              <div className="initials">{d.initials}</div>
            )}
            <div className="shade" />
            <div className="top">
              <span className="chip-glass">{d.featured ? "★ Bulle du moment" : d.country}</span>
              <span className="turn" title="Retourner">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M3 12a9 9 0 0 1 15.5-6.2L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.2L3 16M3 21v-5h5" />
                </svg>
              </span>
            </div>
            <div className="bottom">
              <div className="name">{d.name}</div>
              <div className="role">{d.role}</div>
              <div className="tally">
                <span className="tp">
                  +{d.favorable}
                  <small>pour</small>
                </span>
                <span className="te">
                  ={d.neutre}
                  <small>neutre</small>
                </span>
                <span className="tm">
                  −{d.defavorable}
                  <small>contre</small>
                </span>
              </div>
              <div className="bar">
                <i className="f" style={{ width: pct(d.favorable, total) }} />
                <i className="n" style={{ width: pct(d.neutre, total) }} />
                <i className="d" style={{ width: pct(d.defavorable, total) }} />
              </div>
            </div>
          </div>

          {/* Verso */}
          <div className="face back">
            <div className="head">
              {d.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="avatar" src={d.photo} alt="" loading="lazy" />
              ) : null}
              <div className="name">{d.name}</div>
            </div>
            <div className="hint">Que voulez-vous voir ?</div>
            <Link href={`/p/${d.slug}?vue=plus`} className="choice plus" onClick={stop}>
              <span className="sym">+</span>
              <span>
                <b>Ce qui la soutient</b>
                <small>{d.favorable} articles favorables</small>
              </span>
            </Link>
            <Link href={`/p/${d.slug}?vue=moins`} className="choice minus" onClick={stop}>
              <span className="sym">−</span>
              <span>
                <b>Ce qui l&apos;attaque</b>
                <small>{d.defavorable} articles défavorables</small>
              </span>
            </Link>
            <Link href={`/p/${d.slug}?vue=egal`} className="choice equal" onClick={stop}>
              <span className="sym">=</span>
              <span>
                <b>L&apos;écart</b>
                <small>{d.gap != null ? `${d.gap} points d'écart` : `${total} articles analysés`}</small>
              </span>
            </Link>
            <div className="foot">
              <button type="button">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M3 12a9 9 0 0 1 15.5-6.2L21 8M21 3v5h-5" />
                </svg>
                Retourner
              </button>
              {d.credit && (
                <a className="credit" href={d.credit} target="_blank" rel="noopener noreferrer" onClick={stop}>
                  Photo Wikimedia
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

export interface VideoData {
  videoId: string;
  title: string;
  channel: string;
  views: number;
  thumbnail: string;
  summary: string | null;
  publishedAt: string;
}

function compact(n: number): string {
  return new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

/**
 * Vidéo lisible dans l'application. Le lecteur YouTube (mode confidentialité renforcée)
 * n'est chargé qu'au clic : aucun contact avec Google avant.
 */
export function VideoCard({ v, side }: { v: VideoData; side: "plus" | "minus" }) {
  const [playing, setPlaying] = useState(false);
  return (
    <figure className={`video ${side}`}>
      <div className="video-frame">
        {playing ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${v.videoId}?autoplay=1&rel=0&modestbranding=1`}
            title={v.title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        ) : (
          <button type="button" className="video-poster" onClick={() => setPlaying(true)} aria-label={`Lire : ${v.title}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={v.thumbnail} alt="" loading="lazy" />
            <span className="play">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
            <span className="views">{compact(v.views)} vues</span>
          </button>
        )}
      </div>
      <figcaption>
        <b>{v.title}</b>
        <span>{v.channel}</span>
        {v.summary && <small>{v.summary}</small>}
      </figcaption>
    </figure>
  );
}

interface Hit {
  wiki: string;
  label: string;
  description: string | null;
  thumb: string | null;
  slug: string | null;
}

/**
 * Recherche de n'importe quelle personnalité publique. Les suggestions viennent de Wikipédia :
 * une personne sans article (particulier) n'apparaît jamais.
 */
export function SearchBox({ autoFocus = false, onDone, variant = "hero" }: { autoFocus?: boolean; onDone?: () => void; variant?: "hero" | "overlay" }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
      setHits([]);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: ctrl.signal });
        const json = (await res.json()) as { hits: Hit[] };
        setHits(json.hits ?? []);
        setActive(0);
        setOpen(true);
      } catch {
        // Requête annulée ou réseau indisponible.
      } finally {
        setLoading(false);
      }
    }, 280);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  async function choose(h: Hit) {
    setError(null);
    if (h.slug) {
      onDone?.();
      router.push(`/p/${h.slug}`);
      return;
    }
    setBusy(h.wiki);
    try {
      const res = await fetch("/api/personalities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wiki: h.wiki }),
      });
      const json = (await res.json()) as { slug?: string; error?: string };
      if (!res.ok || !json.slug) throw new Error(json.error ?? "Création impossible");
      onDone?.();
      router.push(`/p/${json.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Création impossible");
      setBusy(null);
    }
  }

  return (
    <div className={`search ${variant === "hero" ? "search-hero" : "search-overlay-box"}`}>
      <div className="search-field">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <input
          type="search"
          value={q}
          autoFocus={autoFocus}
          placeholder="Chercher une personnalité publique…"
          aria-label="Chercher une personnalité publique"
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => hits.length && setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, hits.length - 1));
            if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, 0));
            if (e.key === "Enter" && hits[active]) choose(hits[active]);
            if (e.key === "Escape") setOpen(false);
          }}
        />
        {loading && <span className="spinner" aria-hidden="true" />}
      </div>
      {open && q.trim().length >= 2 && (
        <div className="search-results" role="listbox">
          {hits.length === 0 && !loading && (
            <p className="search-empty">
              Aucune personnalité publique trouvée. Seules les personnes disposant d&apos;un article Wikipédia peuvent être
              recherchées.
            </p>
          )}
          {hits.map((h, i) => (
            <button
              key={h.wiki}
              type="button"
              role="option"
              aria-selected={i === active}
              className={`hit${i === active ? " on" : ""}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(h)}
              disabled={busy != null}
            >
              {h.thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={h.thumb} alt="" />
              ) : (
                <span className="hit-initial">{h.label[0]}</span>
              )}
              <span className="hit-text">
                <b>{h.label}</b>
                {h.description && <small>{h.description}</small>}
              </span>
              <span className={`hit-tag${h.slug ? " known" : ""}`}>
                {busy === h.wiki ? "Création…" : h.slug ? "Voir la fiche" : "Créer la fiche"}
              </span>
            </button>
          ))}
          {error && <p className="search-error">{error}</p>}
          <p className="search-note">Source : Wikipédia. Les particuliers ne peuvent pas être recherchés.</p>
        </div>
      )}
    </div>
  );
}

/** Bouton loupe de l'en-tête : ouvre la recherche en surimpression. */
export function HeaderSearch() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <>
      <button type="button" className="search-trigger" onClick={() => setOpen(true)} aria-label="Rechercher une personnalité">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
      </button>
      {open && (
        <div className="search-overlay" onClick={() => setOpen(false)}>
          <div className="search-panel" onClick={(e) => e.stopPropagation()}>
            <SearchBox autoFocus variant="overlay" onDone={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}

/** Recharge la page à intervalle régulier tant qu'une analyse est en cours. */
export function AutoRefresh({ seconds = 15 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
  return null;
}
