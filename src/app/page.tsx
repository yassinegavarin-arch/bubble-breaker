import Link from "next/link";
import { balance, thermometer } from "@/lib/analysis";
import { getLastUpdate, getOverview, getPersonalities } from "@/lib/queries";
import { isConfigured } from "@/lib/supabase";
import { displayName } from "@/lib/types";
import { BalanceBar, Counts, SetupNotice, formatDate } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (!isConfigured()) {
    return (
      <>
        <Intro />
        <SetupNotice />
      </>
    );
  }

  const [people, overview, lastUpdate] = await Promise.all([getPersonalities(), getOverview(7 * 24), getLastUpdate()]);

  const stats = people.map((p) => {
    const rows = overview.filter((r) => r.personality_id === p.id);
    return { p, b: balance(rows), t: thermometer(rows) };
  });

  const bubble = stats.filter((s) => s.t.gap != null).sort((a, b) => (b.t.gap ?? 0) - (a.t.gap ?? 0))[0];
  const sorted = [...stats].sort((a, b) => b.b.total - a.b.total);

  return (
    <>
      <Intro />

      {bubble && (
        <Link href={`/p/${bubble.p.slug}?vue=egal`} className="highlight" style={{ display: "block", textDecoration: "none" }}>
          <div className="kicker">Bulle de la semaine</div>
          <h2 style={{ margin: "4px 0 6px" }}>{displayName(bubble.p)}</h2>
          <p style={{ margin: 0 }}>
            Les médias {bubble.t.warmest} et les médias {bubble.t.coldest} ne racontent pas la même histoire :{" "}
            <strong>{bubble.t.gap} points d&apos;écart</strong> de solde favorable.
          </p>
        </Link>
      )}

      <div className="grid">
        {sorted.map(({ p, b }) => (
          <Link key={p.id} href={`/p/${p.slug}`} className="person">
            <div className="name">{displayName(p)}</div>
            <div className="role">{p.role}</div>
            {b.total > 0 ? (
              <>
                <BalanceBar b={b} />
                <Counts b={b} />
              </>
            ) : (
              <div className="small muted">Pas encore d&apos;articles classés</div>
            )}
          </Link>
        ))}
      </div>

      <p className="small muted" style={{ marginTop: 20 }}>
        Articles des 7 derniers jours.
        {lastUpdate ? ` Dernière collecte : ${formatDate(lastUpdate)}.` : " Aucune collecte pour l'instant."}
      </p>
    </>
  );
}

function Intro() {
  return (
    <>
      <h1>Ce que lit le camp d&apos;en face</h1>
      <p className="lead">
        Choisissez une personnalité. Le <strong>+</strong> montre ce qui circule en sa faveur, le <strong>−</strong>{" "}
        ce qui circule contre elle, le <strong>=</strong> mesure l&apos;écart entre les deux bulles.
      </p>
    </>
  );
}
