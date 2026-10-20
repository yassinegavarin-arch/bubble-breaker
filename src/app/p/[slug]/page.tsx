import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { balance, storyCards, thermometer, topArguments } from "@/lib/analysis";
import { getFeed, getPersonality } from "@/lib/queries";
import { isConfigured } from "@/lib/supabase";
import { displayName } from "@/lib/types";
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

  const rows = await getFeed(p.id, PERIODS[period]);
  const b = balance(rows);
  const href = (v: View, per: Period = period) => `/p/${slug}?vue=${v}&periode=${per}`;
  const back = href(view);

  return (
    <>
      <p className="small muted" style={{ margin: 0 }}>
        <Link href="/">Personnalités</Link> / {p.country}
      </p>
      <h1>{displayName(p)}</h1>
      <p className="lead" style={{ marginBottom: 0 }}>{p.role}</p>

      {sp.merci && <div className="thanks">Merci, votre signalement a été enregistré.</div>}

      <nav className="tabs" aria-label="Vue">
        <Link href={href("plus")} className={`tab plus${view === "plus" ? " active" : ""}`}>
          <b>+</b>Favorable<span className="n">{b.favorable} articles</span>
        </Link>
        <Link href={href("moins")} className={`tab minus${view === "moins" ? " active" : ""}`}>
          <b>−</b>Défavorable<span className="n">{b.defavorable} articles</span>
        </Link>
        <Link href={href("egal")} className={`tab equal${view === "egal" ? " active" : ""}`}>
          <b>=</b>L&apos;écart<span className="n">{b.total} articles</span>
        </Link>
      </nav>

      <div className="filters">
        {(Object.keys(PERIODS) as Period[]).map((per) => (
          <Link key={per} href={href(view, per)} className={per === period ? "on" : ""}>
            {per === "24h" ? "24 heures" : "7 jours"}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="empty">Aucun article classé sur cette période. La collecte tourne plusieurs fois par jour.</div>
      ) : view === "egal" ? (
        <EqualView rows={rows} />
      ) : (
        <div className="cards">
          {storyCards(rows, view === "plus" ? "favorable" : "defavorable")
            .slice(0, 30)
            .map((card) => (
              <StoryCardView key={card.key} card={card} personalityId={p.id} back={back} />
            ))}
          {(view === "plus" ? b.favorable : b.defavorable) === 0 && (
            <div className="empty">Aucun article de ce camp sur la période.</div>
          )}
        </div>
      )}
    </>
  );
}

function EqualView({ rows }: { rows: Awaited<ReturnType<typeof getFeed>> }) {
  const t = thermometer(rows);
  const pro = topArguments(rows, "favorable");
  const con = topArguments(rows, "defavorable");

  return (
    <>
      <h2 style={{ marginTop: 8 }}>Thermomètre de bulle</h2>
      {t.gap != null ? (
        <p>
          <span className="gap">{t.gap} pts</span>
          <br />
          <span className="muted">
            d&apos;écart de solde entre les médias {t.warmest} et les médias {t.coldest}. Plus l&apos;écart est grand,
            plus les deux camps lisent deux réalités différentes.
          </span>
        </p>
      ) : (
        <p className="muted">Pas encore assez d&apos;articles par sensibilité pour mesurer l&apos;écart (5 minimum).</p>
      )}
      <ThermometerView t={t} />

      <h2>Arguments dominants</h2>
      <div className="two-col">
        <ArgumentList title="Le camp du +" items={pro} cls="plus" />
        <ArgumentList title="Le camp du −" items={con} cls="minus" />
      </div>

      <div className="notice">
        Repères factuels (sondages, résultats électoraux, vérifications des fact-checkeurs) : prévus dans la prochaine
        version.
      </div>
    </>
  );
}

function ArgumentList({
  title,
  items,
  cls,
}: {
  title: string;
  items: ReturnType<typeof topArguments>;
  cls: "plus" | "minus";
}) {
  return (
    <div className={`args ${cls}`}>
      <h3>{title}</h3>
      {items.length === 0 ? (
        <p className="small muted">Pas assez d&apos;articles.</p>
      ) : (
        <ol>
          {items.map((a) => (
            <li key={a.argument}>
              <strong>{a.argument}</strong> <span className="muted small">({a.count} articles)</span>
              <br />
              <a className="small" href={a.example.url} target="_blank" rel="noopener noreferrer">
                {a.example.summary_fr || a.example.title}
              </a>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
