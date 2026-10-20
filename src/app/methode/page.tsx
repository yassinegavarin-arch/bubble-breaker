import type { Metadata } from "next";
import { getSources } from "@/lib/queries";
import { isConfigured } from "@/lib/supabase";
import { VIRAL_MIN_SOURCES, VIRAL_SCORE } from "@/lib/stories";
import { PROMPT_VERSION } from "@/lib/classify";
import { LEANINGS, MIN_CONFIDENCE, type Source } from "@/lib/types";

export const metadata: Metadata = { title: "Méthode" };
export const dynamic = "force-dynamic";

export default async function Methode() {
  const sources: Source[] = isConfigured() ? await getSources() : [];

  return (
    <div className="wrap prose">
      <span className="kicker">Transparence</span>
      <h1>La méthode</h1>
      <p className="lead">
        La même règle s&apos;applique à toutes les personnalités et à tous les médias. Tout est public, y compris les
        limites.
      </p>

      <h2>1. Collecte</h2>
      <p>
        Plusieurs fois par jour, Bubble Breaker lit les flux RSS publics des médias listés plus bas et Google News, en
        français et dans la langue du pays de chaque personnalité. Seuls le titre, un extrait court et le lien sont
        conservés. Un article n&apos;est retenu que si le nom de la personnalité figure dans son titre ou son extrait.
      </p>
      <p>
        <strong>Contenus viraux des réseaux sociaux.</strong> Faute d&apos;accès direct à TikTok, X ou Instagram, Bubble
        Breaker les capte à travers la presse qui les relaie : recherches ciblées (« vidéo virale », « buzz »,
        « TikTok », « sur X »…) et sites spécialisés dans la reprise de posts viraux (Konbini, Brut, Mediaite, Twitchy,
        The Daily Dot…). Ces articles portent la mention « Vu sur les réseaux ».
      </p>
      <p>
        <strong>Vidéos YouTube.</strong> Toutes les 6 heures, les vidéos les plus vues de la semaine sur chaque
        personnalité sont récupérées avec leur nombre de vues, puis classées comme les articles. Elles se lisent
        directement dans l&apos;application.
      </p>

      <h2>2. Classement</h2>
      <p>
        Une IA lit le titre et l&apos;extrait, et indique si l&apos;article présente la personnalité sous un jour
        favorable, défavorable ou neutre, avec un indice de confiance et une justification d&apos;une phrase. Elle juge
        le contenu, jamais le média. Un classement dont la confiance est inférieure à {MIN_CONFIDENCE * 100} % n&apos;est
        pas affiché. Version de la consigne : {PROMPT_VERSION}.
      </p>

      <h2>3. Viralité</h2>
      <p>
        Les articles qui racontent le même fait sont regroupés. Chaque fait reçoit un score sur 100, calculé en rang
        centile parmi les faits de la même personnalité sur 7 jours : nombre de médias qui le reprennent (40 %), nombre
        de sensibilités différentes qui le reprennent (35 %), nombre d&apos;articles dans les 12 premières heures (25 %).
        Un fait est marqué « viral » à partir de {VIRAL_SCORE}/100 et d&apos;au moins {VIRAL_MIN_SOURCES} médias.
      </p>

      <h2>4. Écart de bulle</h2>
      <p>
        Pour chaque sensibilité de médias, le solde est la part d&apos;articles favorables moins la part
        d&apos;articles défavorables. L&apos;écart de bulle est la différence entre la sensibilité la plus favorable et
        la plus défavorable (5 articles minimum par sensibilité).
      </p>

      <h2>5. Limites</h2>
      <ul>
        <li>La presse n&apos;est pas les réseaux sociaux : TikTok, Instagram, X et les messageries ne sont pas encore couverts.</li>
        <li>Le classement des médias par sensibilité éditoriale est une convention, discutable par nature.</li>
        <li>L&apos;IA se trompe parfois, notamment sur l&apos;ironie. Chaque carte peut être signalée.</li>
      </ul>

      <h2>Médias suivis</h2>
      {sources.length === 0 ? (
        <p className="muted">Liste disponible une fois la base connectée.</p>
      ) : (
        <table className="list">
          <thead>
            <tr>
              <th>Sensibilité</th>
              <th>Médias</th>
            </tr>
          </thead>
          <tbody>
            {LEANINGS.map((l) => (
              <tr key={l}>
                <td style={{ whiteSpace: "nowrap" }}>
                  <span className={`dot ${l}`} style={{ display: "inline-block", marginRight: 8 }} />
                  {l}
                </td>
                <td>
                  {Array.from(new Set(sources.filter((s) => s.leaning === l).map((s) => `${s.name} (${s.country})`))).join(", ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
