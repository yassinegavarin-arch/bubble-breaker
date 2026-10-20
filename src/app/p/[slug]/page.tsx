import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { COUNTRIES } from "@/data/personalities";
import { balance, storyCards, thermometer, topArguments } from "@/lib/analysis";
import { getPortrait } from "@/lib/portraits";
import { getFeed, getPersonality } from "@/lib/queries";
import { isConfigured } from "@/lib/supabase";
import { displayName } from "@/lib/types";
import { Reveal } from "@/components/client";
import { SetupNotice, StoryCardView, ThermometerView } from "@/components/ui";

export const dynamic = "force-dynamic";

type View = "plus" | "moins" | "egal";
const PERIODS = { "24h": 24, "7j": 7 * 24 } as const;
type Period = keyof typeof PERIODS;

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ vue?: string; periode?: string; merci?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!isConfigured()) return {};
  const { slug } = await params;
  const p = await getPersonality(slug);
  return p ? { title: displayName(p) } : {};
}

export default async function PersonalityPage({ params, searchParams }: Props) {
  if (!isConfigured()) return <SetupNotice />;

  const { slug } = await params;
  const sp = await searchParams;
  const view: View = sp.vue === "plus" || sp.vue === "moins" ? sp.vue : "egal";
  const period: Period = sp.periode === "24h" ? "24h" : "7j";

  const p = await getPersonality(slug);
  if (!p) notFound();

  const [rows, portrait] = await Promise.all([getFeed(p.id, PERIODS[period]), getPortrait(slug)]);
  const b = balance(rows);
  const href = (v: View, per: Period = period) => `/p/${slug}?vue=${v}&periode=${per}`;
  const back = href(view);
  const name = displayName(p);

  return (
    <>
      <section className="p-hero">
        {portrait && <div className="bgimg" style={{ backgroundImage: `url(${portrait.src})` }} />}
        <div className="wrap">
          <div className="crumb">
            <Link href="/#personnalites">← Toutes les personnalités</Link>
          </div>
          <div className="row">
            {portrait ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="portrait" src={portrait.src} alt={name} />
            ) : null}
            <div>
              <h1>{name}</h1>
              <div className="role">
                {COUNTRIES[p.country] ?? p.country} · {p.role}
              </div>
              {portrait && (
                <a className="credit" style={{ color: "rgba(255,255,255,0.55)" }} href={portrait.credit} target="_blank" rel="noopener noreferrer">
                  Photo : Wikimedia Commons
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="wrap">
        <nav className="seg" aria-label="Vue">
          <Link href={href("plus")} className={`plus${view === "plus" ? " on" : ""}`}>
            <span className="sym">+</span>
            <span>
              <b>Ce qui la soutient</b>
              <small>{b.favorable} articles favorables</small>
            </span>
          </Link>
          <Link href={href("moins")} className={`minus${view === "moins" ? " on" : ""}`}>
            <span className="sym">−</span>
            <span>
              <b>Ce qui l&apos;attaque</b>
              <small>{b.defavorable} articles défavorables</small>
            </span>
          </Link>
          <Link href={href("egal")} className={`equal${view === "egal" ? " on" : ""}`}>
            <span className="sym">=</span>
            <span>
              <b>L&apos;écart entre les bulles</b>
              <small>{b.total} articles analysés</small>
            </span>
          </Link>
        </nav>

        <div className="filters">
          {(Object.keys(PERIODS) as Period[]).map((per) => (
            <Link key={per} href={href(view, per)} className={per === period ? "on" : ""}>
              {per === "24h" ? "Dernières 24 heures" : "7 derniers jours"}
            </Link>
          ))}
        </div>

        {sp.merci && <div className="thanks">Merci, votre signalement a été enregistré.</div>}

        {rows.length === 0 ? (
          <div className="empty">Aucun article classé sur cette période. La collecte tourne plusieurs fois par jour.</div>
        ) : view === "egal" ? (
          <EqualView rows={rows} />
        ) : (
          <StoryList rows={rows} side={view === "plus" ? "plus" : "minus"} personalityId={p.id} back={back} />
        )}
      </div>
    </>
  );
}

function StoryList({
  rows,
  side,
  personalityId,
  back,
}: {
  rows: Awaited<ReturnType<typeof getFeed>>;
  side: "plus" | "minus";
  personalityId: number;
  back: string;
}) {
  const cards = storyCards(rows, side === "plus" ? "favorable" : "defavorable").slice(0, 30);
  if (cards.length === 0) return <div className="empty">Aucun article de ce camp sur la période.</div>;
  return (
    <div className="stories">
      {cards.map((card, i) => (
        <Reveal key={card.key} delay={Math.min(i, 5) * 70}>
          <StoryCardView card={card} personalityId={personalityId} back={back} side={side} />
        </Reveal>
      ))}
    </div>
  );
}

function EqualView({ rows }: { rows: Awaited<ReturnType<typeof getFeed>> }) {
  const t = thermometer(rows);
  const pro = topArguments(rows, "favorable");
  const con = topArguments(rows, "defavorable");

  return (
    <div className="equal-grid">
      <Reveal>
        <div className="panel">
          <span className="kicker">Thermomètre de bulle</span>
          {t.gap != null ? (
            <>
              <div className="gap-number" style={{ margin: "14px 0 6px" }}>
                {t.gap}
                <small> points d&apos;écart</small>
              </div>
              <p className="muted" style={{ marginTop: 0 }}>
                Entre les médias {t.warmest} et les médias {t.coldest}. Plus l&apos;écart est grand, plus les deux camps
                lisent deux réalités différentes.
              </p>
            </>
          ) : (
            <p className="muted">Pas encore assez d&apos;articles par sensibilité pour mesurer l&apos;écart (5 minimum).</p>
          )}
          <ThermometerView t={t} />
        </div>
      </Reveal>
      <Reveal delay={120}>
        <div className="panel">
          <span className="kicker">Arguments dominants</span>
          <h2 style={{ margin: "8px 0 16px" }}>Ce que chaque camp met en avant</h2>
          <ArgumentList title="Le camp du +" items={pro} cls="plus" />
          <ArgumentList title="Le camp du −" items={con} cls="minus" />
          <div className="notice">Repères factuels (sondages, résultats, fact-checks) : prévus dans la prochaine version.</div>
        </div>
      </Reveal>
    </div>
  );
}

function ArgumentList({ title, items, cls }: { title: string; items: ReturnType<typeof topArguments>; cls: "plus" | "minus" }) {
  return (
    <div className={`args ${cls}`}>
      <h3>{title}</h3>
      {items.length === 0 ? (
        <p className="small muted" style={{ margin: 0 }}>
          Pas assez d&apos;articles.
        </p>
      ) : (
        <ol>
          {items.map((a) => (
            <li key={a.argument}>
              <strong style={{ textTransform: "capitalize" }}>{a.argument}</strong>{" "}
              <span className="muted small">({a.count} articles)</span>
              <br />
              <a href={a.example.url} target="_blank" rel="noopener noreferrer">
                {a.example.summary_fr || a.example.title}
              </a>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
