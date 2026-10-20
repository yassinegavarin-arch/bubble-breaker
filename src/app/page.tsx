import Link from "next/link";
import { FLAGS, PERSONALITIES } from "@/data/personalities";
import { balance, thermometer } from "@/lib/analysis";
import { getPortraits } from "@/lib/portraits";
import { getCounts, getLastUpdate, getOverview, getPersonalities } from "@/lib/queries";
import { isConfigured } from "@/lib/supabase";
import { displayName } from "@/lib/types";
import { Bubbles, CountUp, FlipCard, Reveal, type FlipCardData } from "@/components/client";
import { SetupNotice, ThermometerView, formatDate } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (!isConfigured()) {
    return (
      <>
        <Hero articles={0} sources={0} people={PERSONALITIES.length} />
        <SetupNotice />
      </>
    );
  }

  const [people, overview, portraits, counts, lastUpdate] = await Promise.all([
    getPersonalities(),
    getOverview(7 * 24),
    getPortraits(),
    getCounts(),
    getLastUpdate(),
  ]);

  const stats = people.map((p) => {
    const rows = overview.filter((r) => r.personality_id === p.id);
    return { p, b: balance(rows), t: thermometer(rows) };
  });
  const bubble = stats.filter((s) => s.t.gap != null).sort((a, b) => (b.t.gap ?? 0) - (a.t.gap ?? 0))[0];
  const sorted = [...stats].sort((a, b) => b.b.total - a.b.total);

  const cards: FlipCardData[] = sorted.map(({ p, b, t }) => {
    const portrait = portraits[p.slug] ?? null;
    return {
      slug: p.slug,
      name: displayName(p),
      role: p.role ?? "",
      flag: FLAGS[p.country] ?? "",
      country: p.country,
      photo: portrait?.src ?? null,
      credit: portrait?.credit ?? null,
      initials: `${p.first_name?.[0] ?? ""}${p.last_name[0]}`,
      favorable: b.favorable,
      neutre: b.neutre,
      defavorable: b.defavorable,
      gap: t.gap,
    };
  });

  const bubblePhoto = bubble ? portraits[bubble.p.slug] : null;

  return (
    <>
      <Hero articles={counts.articles} sources={counts.sources} people={people.length} />

      {bubble && (
        <section className="block" id="bulle">
          <div className="wrap">
            <Reveal>
              <span className="kicker">Bulle de la semaine</span>
              <h2 className="section-title">Deux camps, deux réalités</h2>
              <p className="section-lead">
                La personnalité dont le portrait change le plus d&apos;un bord médiatique à l&apos;autre sur 7 jours.
              </p>
            </Reveal>
            <Reveal delay={120}>
              <Link href={`/p/${bubble.p.slug}?vue=egal`} className="spotlight">
                <div className="photo">
                  {bubblePhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={bubblePhoto.src} alt={displayName(bubble.p)} />
                  ) : null}
                </div>
                <div className="body">
                  <h3>{displayName(bubble.p)}</h3>
                  <div className="gap-number">
                    {bubble.t.gap}
                    <small> points d&apos;écart</small>
                  </div>
                  <p className="muted" style={{ margin: 0 }}>
                    Les médias {bubble.t.warmest} la présentent bien plus favorablement que les médias {bubble.t.coldest}.
                  </p>
                  <div>
                    <ThermometerView t={bubble.t} />
                  </div>
                </div>
              </Link>
            </Reveal>
          </div>
        </section>
      )}

      <section className="block cream" id="personnalites">
        <div className="wrap">
          <Reveal>
            <span className="kicker">Personnalités</span>
            <h2 className="section-title">Retournez une carte</h2>
            <p className="section-lead">
              Au recto, le bilan de la semaine : <b style={{ color: "var(--plus)" }}>+ pour</b>,{" "}
              <b style={{ color: "var(--equal)" }}>= neutre</b>, <b style={{ color: "var(--minus)" }}>− contre</b>. Au
              verso, choisissez ce que vous voulez voir.
            </p>
          </Reveal>
          <div className="grid">
            {cards.map((d, i) => (
              <FlipCard key={d.slug} d={d} delay={(i % 4) * 90} />
            ))}
          </div>
          <p className="small muted" style={{ marginTop: 30 }}>
            Articles des 7 derniers jours, classés avec une confiance d&apos;au moins 70 %.
            {lastUpdate ? ` Dernière collecte : ${formatDate(lastUpdate)}.` : ""}
          </p>
        </div>
      </section>
    </>
  );
}

function Hero({ articles, sources, people }: { articles: number; sources: number; people: number }) {
  return (
    <section className="hero">
      <Bubbles />
      <div className="wrap">
        <Reveal>
          <span className="kicker">Sortir des bulles algorithmiques</span>
        </Reveal>
        <Reveal delay={100}>
          <h1>
            Ce que lit le <em>camp d&apos;en face</em>
          </h1>
        </Reveal>
        <Reveal delay={200}>
          <p className="tagline">Même actualité, autres lunettes</p>
        </Reveal>
        <Reveal delay={300}>
          <p className="intro">
            Votre fil vous montre ce qui vous plaît. Ici, pour chaque personnalité, voyez ce qui circule{" "}
            <b className="p">en sa faveur</b>, <b className="m">contre elle</b>, et{" "}
            <b className="e">l&apos;écart entre les deux bulles</b>.
          </p>
        </Reveal>
        <Reveal delay={400}>
          <a href="#personnalites" className="btn">
            Choisir une personnalité
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          </a>
        </Reveal>
        <Reveal delay={500}>
          <div className="stats">
            <div className="stat">
              <b>
                <CountUp value={articles} />
              </b>
              <span>articles cette semaine</span>
            </div>
            <div className="stat">
              <b>
                <CountUp value={sources} />
              </b>
              <span>médias suivis</span>
            </div>
            <div className="stat">
              <b>
                <CountUp value={people} />
              </b>
              <span>personnalités</span>
            </div>
          </div>
        </Reveal>
      </div>
      <div className="scroll-hint" />
    </section>
  );
}
