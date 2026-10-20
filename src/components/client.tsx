"use client";

import Link from "next/link";
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
