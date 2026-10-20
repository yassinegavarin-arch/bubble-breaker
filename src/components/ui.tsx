import type { Balance, StoryCard, Thermometer } from "@/lib/analysis";

const fmtDate = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

export function formatDate(iso: string): string {
  return fmtDate.format(new Date(iso));
}

function pct(part: number, total: number): string {
  return total ? `${(part / total) * 100}%` : "0%";
}

export function BalanceBar({ b, tall = false }: { b: Balance; tall?: boolean }) {
  return (
    <div className={`bar${tall ? " tall" : ""}`} aria-label={`${b.favorable} favorables, ${b.neutre} neutres, ${b.defavorable} défavorables`}>
      <i className="f" style={{ width: pct(b.favorable, b.total) }} />
      <i className="n" style={{ width: pct(b.neutre, b.total) }} />
      <i className="d" style={{ width: pct(b.defavorable, b.total) }} />
    </div>
  );
}

export function Counts({ b }: { b: Balance }) {
  return (
    <div className="counts">
      <span className="cf">+ {b.favorable}</span>
      <span>= {b.neutre}</span>
      <span className="cd">− {b.defavorable}</span>
    </div>
  );
}

export function SetupNotice() {
  return (
    <div className="empty">
      La base de données n&apos;est pas encore connectée. Renseignez les variables Supabase dans Vercel (voir le
      README du projet), puis redéployez.
    </div>
  );
}

function ReportForm({ articleId, personalityId, back }: { articleId: number; personalityId: number; back: string }) {
  return (
    <details>
      <summary>Signaler une erreur</summary>
      <form className="report-form" method="post" action="/api/report">
        <input type="hidden" name="article_id" value={articleId} />
        <input type="hidden" name="personality_id" value={personalityId} />
        <input type="hidden" name="back" value={back} />
        <select name="reason" defaultValue="mauvais_camp" aria-label="Motif">
          <option value="mauvais_camp">Mauvais classement</option>
          <option value="satire">Satire mal comprise</option>
          <option value="hors_sujet">Hors sujet</option>
          <option value="illicite">Contenu illicite</option>
          <option value="autre">Autre</option>
        </select>
        <input name="comment" maxLength={500} placeholder="Précision (facultatif)" aria-label="Précision" />
        <button type="submit">Envoyer</button>
      </form>
    </details>
  );
}

export function StoryCardView({ card, personalityId, back }: { card: StoryCard; personalityId: number; back: string }) {
  const sourceCount = new Set(card.articles.map((a) => a.source_name)).size;
  return (
    <article className="card">
      <h3>
        <a href={card.url} target="_blank" rel="noopener noreferrer">
          {card.headline}
        </a>
      </h3>
      <div className="meta">
        {card.isViral && <span className="badge viral">Viral</span>}
        {card.satire && <span className="badge satire">Satire</span>}
        <span>
          {sourceCount} média{sourceCount > 1 ? "s" : ""}
          {card.leanings.length > 0 && ` · ${card.leanings.length} sensibilité${card.leanings.length > 1 ? "s" : ""}`}
        </span>
        <span>Score {Math.round(card.score)}/100</span>
        {card.argument && <span>Thème : {card.argument}</span>}
        <span>{formatDate(card.firstSeen)}</span>
      </div>
      {card.summary && <p style={{ margin: "0 0 6px" }}>{card.summary}</p>}
      <ul className="sources">
        {card.articles.slice(0, 6).map((a) => (
          <li key={a.article_id}>
            <a href={a.url} target="_blank" rel="noopener noreferrer" title={a.title}>
              {a.source_name}
            </a>
            <span className="chip">{a.leaning ?? "non classé"}</span>
          </li>
        ))}
        {card.articles.length > 6 && <li className="muted">et {card.articles.length - 6} autres articles</li>}
      </ul>
      <details>
        <summary>Pourquoi ce classement ?</summary>
        {card.justification}
        {card.confidence != null && <span className="muted"> (confiance {Math.round(card.confidence * 100)} %)</span>}
      </details>
      <ReportForm articleId={card.articles[0].article_id} personalityId={personalityId} back={back} />
    </article>
  );
}

export function ThermometerView({ t }: { t: Thermometer }) {
  return (
    <div className="thermo">
      {t.buckets.map(({ leaning, balance }) => (
        <div className="thermo-row" key={leaning}>
          <span className="label">Médias {leaning}</span>
          {balance.total > 0 ? <BalanceBar b={balance} tall /> : <span className="muted small">aucun article</span>}
          <span className={`net ${balance.net > 0 ? "pos" : balance.net < 0 ? "neg" : ""}`}>
            {balance.total > 0 ? `${balance.net > 0 ? "+" : ""}${balance.net}` : "–"}
          </span>
        </div>
      ))}
      <div className="thermo-row overall">
        <span className="label">Ensemble</span>
        <BalanceBar b={t.overall} tall />
        <span className={`net ${t.overall.net > 0 ? "pos" : t.overall.net < 0 ? "neg" : ""}`}>
          {t.overall.net > 0 ? "+" : ""}
          {t.overall.net}
        </span>
      </div>
      <div className="legend">
        <span><i style={{ background: "var(--plus)" }} />favorable</span>
        <span><i style={{ background: "var(--neutral)" }} />neutre</span>
        <span><i style={{ background: "var(--minus)" }} />défavorable</span>
        <span>Solde = % favorable − % défavorable</span>
      </div>
    </div>
  );
}
