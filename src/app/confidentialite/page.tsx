import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL } from "@/data/legal";

export const metadata: Metadata = { title: "Politique de confidentialité" };

export default function Confidentialite() {
  return (
    <div className="wrap prose">
      <span className="kicker">Données personnelles</span>
      <h1>Politique de confidentialité</h1>
      <p className="lead">
        En bref : pas de compte, pas de cookie, pas de publicité, pas de pistage. Le site collecte le strict minimum.
      </p>

      <h2>Responsable du traitement</h2>
      <p>
        {LEGAL.publisher}, éditeur du site. Contact : <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
      </p>

      <h2>Données concernant les visiteurs</h2>
      <table className="list">
        <thead>
          <tr>
            <th>Donnée</th>
            <th>Finalité</th>
            <th>Base légale</th>
            <th>Conservation</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Journaux techniques de l&apos;hébergeur (adresse IP, navigateur, page demandée)</td>
            <td>Sécurité et bon fonctionnement du site</td>
            <td>Intérêt légitime</td>
            <td>Selon la politique de Vercel, quelques jours</td>
          </tr>
          <tr>
            <td>Signalements (motif et commentaire facultatif, sans nom ni adresse e-mail)</td>
            <td>Corriger les erreurs de classement, retirer un contenu illicite</td>
            <td>Intérêt légitime</td>
            <td>{LEGAL.reportsRetention}</td>
          </tr>
        </tbody>
      </table>
      <p>
        Ne saisissez pas de données personnelles dans le commentaire d&apos;un signalement.
      </p>

      <h2>Cookies et traceurs</h2>
      <p>
        Le site ne dépose aucun cookie et n&apos;utilise aucun outil de mesure d&apos;audience, de publicité ou de
        réseau social. Aucun bandeau de consentement n&apos;est donc nécessaire. Les polices de caractères, les
        portraits et les miniatures de vidéos sont servis par le site lui-même : votre navigateur ne contacte ni
        Google ni Wikimedia.
      </p>
      <p>
        <strong>Vidéos YouTube :</strong> le lecteur n&apos;est chargé que si vous cliquez sur « lire ». Il utilise le
        mode de confidentialité renforcée de YouTube (youtube-nocookie.com). Dès que vous lancez une vidéo, Google
        reçoit votre adresse IP et peut appliquer ses propres règles, décrites dans la{" "}
        <a href="https://policies.google.com/privacy?hl=fr" target="_blank" rel="noopener noreferrer">
          politique de confidentialité de Google
        </a>
        .
      </p>

      <h2>Données concernant les personnalités et les articles</h2>
      <p>
        Le site traite des informations publiques sur des personnalités politiques (nom, fonction, articles de presse
        les concernant, portrait publié sous licence libre), dans un but d&apos;information du public sur le débat
        politique. Les titres et extraits d&apos;articles, qui sont publics, sont transmis à un service
        d&apos;intelligence artificielle (Google Gemini) pour être classés. Aucune donnée de visiteur n&apos;est
        transmise à ce service.
      </p>

      <h2>Sous-traitants et transferts</h2>
      <p>
        Vercel Inc. (hébergement du site, États-Unis), Supabase Inc. (base de données hébergée à Francfort, Union
        européenne) et Google (classement par IA des articles, données des vidéos YouTube). Les transferts vers les États-Unis sont encadrés par le cadre de protection des données UE–États-Unis
        ou par les clauses contractuelles types de la Commission européenne.
      </p>

      <h2>Vos droits</h2>
      <p>
        Vous disposez d&apos;un droit d&apos;accès, de rectification, d&apos;effacement, d&apos;opposition et de
        limitation sur les données vous concernant. Écrivez à <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
        Vous pouvez aussi adresser une réclamation à la CNIL (
        <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">cnil.fr</a>).
      </p>

      <p className="small muted">
        Voir aussi : <Link href="/mentions-legales">mentions légales</Link> ·{" "}
        <Link href="/conditions">conditions d&apos;utilisation</Link>. Dernière mise à jour : {LEGAL.updated}.
      </p>
    </div>
  );
}
