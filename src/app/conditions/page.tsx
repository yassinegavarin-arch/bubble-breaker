import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL } from "@/data/legal";

export const metadata: Metadata = { title: "Conditions d'utilisation" };

export default function Conditions() {
  return (
    <div className="wrap prose">
      <span className="kicker">Règles du jeu</span>
      <h1>Conditions d&apos;utilisation</h1>
      <p className="lead">L&apos;utilisation du site vaut acceptation des présentes conditions.</p>

      <h2>1. Objet</h2>
      <p>
        {LEGAL.siteName} permet de comparer la façon dont différents médias traitent une même personnalité politique.
        Le service est gratuit, sans inscription et sans publicité.
      </p>

      <h2>2. Un classement automatique, pas une opinion</h2>
      <p>
        Les articles sont classés « favorables », « défavorables » ou « neutres » par une intelligence artificielle,
        selon une <Link href="/methode">méthode publique</Link> identique pour toutes les personnalités. Ce classement
        décrit la tonalité d&apos;un article, pas la vérité des faits qu&apos;il rapporte. Il ne reflète aucune
        opinion de l&apos;éditeur et ne constitue ni une consigne de vote ni une vérification des faits. Des erreurs
        sont possibles : chaque carte peut être signalée.
      </p>

      <h2>3. Classement des médias</h2>
      <p>
        Le rattachement d&apos;un média à une sensibilité éditoriale (gauche, centre, droite, etc.) est une convention
        destinée à la comparaison. Il est publié en intégralité et peut être contesté par écrit.
      </p>

      <h2>4. Contenus de tiers</h2>
      <p>
        Les titres, extraits et liens renvoient à des articles publiés par des tiers, sous leur seule responsabilité.
        {` ${LEGAL.siteName}`} ne contrôle pas ces sites et ne peut être tenu responsable de leur contenu. Sur
        demande motivée, un contenu est retiré dans les meilleurs délais.
      </p>

      <h2>5. Utilisation acceptable</h2>
      <p>
        Il est interdit de perturber le fonctionnement du site, d&apos;en extraire massivement les données par des
        moyens automatisés, ou d&apos;utiliser les signalements pour harceler ou diffamer.
      </p>

      <h2>6. Responsabilité</h2>
      <p>
        Le site est fourni en l&apos;état, sans garantie d&apos;exhaustivité ni de disponibilité permanente.
        L&apos;éditeur ne saurait être tenu responsable d&apos;une décision prise sur la base des informations
        affichées.
      </p>

      <h2>7. Droit applicable</h2>
      <p>Les présentes conditions sont soumises au droit français. Contact : <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.</p>

      <p className="small muted">Dernière mise à jour : {LEGAL.updated}.</p>
    </div>
  );
}
