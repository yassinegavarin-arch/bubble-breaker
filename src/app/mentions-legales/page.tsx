import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL } from "@/data/legal";

export const metadata: Metadata = { title: "Mentions légales" };

export default function MentionsLegales() {
  return (
    <div className="wrap prose">
      <span className="kicker">Informations légales</span>
      <h1>Mentions légales</h1>
      <p className="lead">Conformément à l&apos;article 6 de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l&apos;économie numérique (LCEN).</p>

      <h2>Éditeur</h2>
      <p>
        Le site {LEGAL.siteName} ({LEGAL.siteUrl}) est édité à titre non professionnel et non commercial par{" "}
        {LEGAL.publisher}, personne physique.
        <br />
        Contact : <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>
      </p>

      <h2>Directeur de la publication</h2>
      <p>{LEGAL.publisher}</p>

      <h2>Hébergement</h2>
      <p>
        <strong>Site :</strong> Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis,{" "}
        <a href="https://vercel.com" target="_blank" rel="noopener noreferrer">vercel.com</a>.
        <br />
        <strong>Base de données :</strong> Supabase Inc., données hébergées dans la région Union européenne (Francfort,
        Allemagne), <a href="https://supabase.com" target="_blank" rel="noopener noreferrer">supabase.com</a>.
      </p>

      <h2>Nature du service</h2>
      <p>
        {LEGAL.siteName} recense des articles de presse publiquement accessibles et les classe automatiquement à
        l&apos;aide d&apos;une intelligence artificielle. Le site n&apos;est affilié à aucun parti, candidat ou média.
        Les règles de collecte et de classement sont publiques : voir <Link href="/methode">la méthode</Link>.
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        Les articles cités restent la propriété de leurs éditeurs. Le site n&apos;en reproduit que le titre, un extrait
        de quelques lignes et un lien vers la source, dans le cadre du droit de courte citation à des fins
        d&apos;information (article L122-5 du Code de la propriété intellectuelle). Tout éditeur peut demander le
        retrait d&apos;un contenu à l&apos;adresse ci-dessus : la demande est traitée sous 72 heures.
      </p>
      <p>
        Les portraits proviennent de Wikimedia Commons, sous licences libres. Auteurs et licences :{" "}
        <Link href="/credits">crédits photos</Link>.
      </p>

      <h2>Signaler un contenu</h2>
      <p>
        Chaque carte comporte un bouton « Signaler une erreur ». Pour un contenu manifestement illicite, écrivez à{" "}
        <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> en précisant l&apos;adresse de la page et le motif.
      </p>

      <p className="small muted">Voir aussi : <Link href="/conditions">conditions d&apos;utilisation</Link> · <Link href="/confidentialite">politique de confidentialité</Link>. Dernière mise à jour : {LEGAL.updated}.</p>
    </div>
  );
}
