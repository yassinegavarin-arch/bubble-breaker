import Link from "next/link";
import { PERSONALITIES, countryName } from "@/data/personalities";
import { balance, thermometer } from "@/lib/analysis";
import { getPortraits } from "@/lib/portraits";
import { getCounts, getLastUpdate, getOverview, getPersonalities } from "@/lib/queries";
import { isConfigured } from "@/lib/supabase";
import { displayName } from "@/lib/types";
import { Bubbles, CountUp, FlipCard, Reveal, SearchBox, type FlipCardData } from "@/components/client";
import { SetupNotice, formatDate } from "@/components/ui";

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

  const [all, overview, counts, lastUpdate] = await Promise.all([
    getPersonalities(),
    getOverview(7 * 24),
    getCounts(),
    getLastUpdate(),
  ]);
  const people = all.filter((p) => p.origin !== "search");
  const searched = all
    .filter((p) => p.origin === "search")
    .sort((a, b) => Date.parse(b.last_viewed_at ?? b.created_at) - Date.parse(a.last_viewed_at ?? a.created_at))
    .slice(0, 12);
  const portraits = await getPortraits([...people, ...searched]);

  const stats = people.map((p) => {
    const rows = overview.filter((r) => r.personality_id === p.id);
    return { p, b: balance(rows), t: thermometer(rows) };
  });
  const bubble = stats.filter((s) => s.t.gap != null).sort((a, b) => (b.t.gap ?? 0) - (a.t.gap ?? 0))[0];
  const sorted = [...stats].sort(
    (a, b) => Number(b.p.id === bubble?.p.id) - Number(a.p.id === bubble?.p.id) || b.b.total - a.b.total,
  );

  const cards: FlipCardData[] = sorted.map(({ p, b, t }) => {
    const portrait = portraits[p.slug] ?? null;
    return {
      slug: p.slug,
      name: displayName(p),
      role: p.role ?? "",
      country: countryName(p.country),
      photo: portrait?.src ?? null,
      credit: portrait?.credit ?? null,
      initials: `${p.first_name?.[0] ?? ""}${p.last_name[0]}`,
      favorable: b.favorable,
      neutre: b.neutre,
      defavorable: b.defavorable,
      gap: t.gap,
      featured: p.id === bubble?.p.id,
    };
  });

  const bubblePhoto = bubble ? portraits[bubble.p.slug] : null;

  return (
    <>
      <Hero articles={counts.articles} sources={counts.sources} people={people.length} />

      {bubble && (
        <section className="bubble-band" id="bulle">
          <div className="wrap">
            <Reveal>
              <Link href={`/p/${bubble.p.slug}?vue=egal`} className="moment">
                {bubblePhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="moment-photo" src={bubblePhoto.src} alt={displayName(bubble.p)} />
                ) : null}
                <div className="moment-text">
                  <span className="moment-kicker">Bulle du moment</span>
                  <strong>{displayName(bubble.p)}</strong>
                  <span className="moment-line">
                    Les médias {bubble.t.warmest} et {bubble.t.coldest} ne racontent pas la même histoire.
                  </span>
                </div>
                <span className="moment-gap">
                  {bubble.t.gap}
                  <small>pts d&apos;écart</small>
                </span>
                <span className="moment-go" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </span>
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
              Votre personnalité n&apos;est pas dans la liste ? Cherchez-la plus haut : sa fiche se crée en
              quelques minutes. Au recto, le bilan de la semaine : <b style={{ color: "var(--plus)" }}>+ pour</b>,{" "}
              <b style={{ color: "var(--equal)" }}>= neutre</b>, <b style={{ color: "var(--minus)" }}>− contre</b>. Au
              verso, choisissez ce que vous voulez voir.
            </p>
          </Reveal>
          <div className="grid">
            {cards.map((d, i) => (
              <FlipCard key={d.slug} d={d} delay={(i % 4) * 90} />
            ))}
          </div>
          {searched.length > 0 && (
            <div className="recent">
              <h3>Recherchées récemment</h3>
              <div className="recent-list">
                {searched.map((p) => {
                  const ph = portraits[p.slug];
                  return (
                    <Link key={p.slug} href={`/p/${p.slug}`} className="chip-person">
                      {ph ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={ph.src} alt="" />
                      ) : (
                        <span className="hit-initial">{p.last_name[0]}</span>
                      )}
                      <span>{displayName(p)}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
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
        <Reveal delay={350}>
          <SearchBox />
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
