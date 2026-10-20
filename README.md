# Bubble Breaker

Sortir des bulles algorithmiques : voir ce que lit le camp d'en face, et mesurer l'écart.

Pour chaque personnalité politique, l'application montre les faits les plus repris par la presse en sa faveur (**+**), contre elle (**−**), et un thermomètre de bulle (**=**) qui compare ce que racontent les médias de gauche, du centre et de droite.

## Fonctionnement (version gratuite)

1. **Collecte** : flux RSS publics des médias et Google News, plusieurs fois par jour.
2. **Regroupement** : les articles qui racontent le même fait sont réunis.
3. **Viralité** : score sur 100 (nombre de médias 40 %, nombre de sensibilités 35 %, vitesse 25 %).
4. **Classement IA** : favorable, défavorable, neutre ou hors sujet, avec justification.
5. **Écrans** : accueil, fiche personnalité (+, −, =), méthode, signalement d'erreur.

Technologies : Next.js sur Vercel, base Supabase (Postgres), IA Gemini (offre gratuite) ou Claude.

## Mise en route

### 1. Base de données Supabase

1. Sur [supabase.com](https://supabase.com), créer un projet (offre gratuite, région Europe).
2. Menu **SQL Editor** > **New query** : coller le contenu de `supabase/schema.sql`, cliquer sur **Run**.
3. Nouvelle requête : coller `supabase/seed.sql`, cliquer sur **Run**.
4. Menu **Project Settings** > **API** : noter l'URL du projet, la clé `anon` et la clé `service_role`.

### 2. Clé IA

Créer une clé gratuite sur [aistudio.google.com](https://aistudio.google.com) (menu Dashboard > API keys, ou directement aistudio.google.com/apikey). Vérifier les conditions de l'offre gratuite : les données envoyées peuvent servir à améliorer les modèles de Google. Les articles étant publics, ce n'est pas bloquant.

### 3. Déploiement Vercel

1. Sur [vercel.com](https://vercel.com), **Add New** > **Project**, importer le dépôt `bubble-breaker`.
2. Avant de cliquer sur **Deploy**, ouvrir **Environment Variables** et renseigner les variables de `.env.example` :

| Variable | Valeur |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clé `anon` |
| `SUPABASE_SERVICE_ROLE_KEY` | clé `service_role` (secrète) |
| `CRON_SECRET` | une longue chaîne aléatoire |
| `LLM_PROVIDER` | `gemini` |
| `LLM_MODEL` | `gemini-3.8-flash` (modèle Flash gratuit en vigueur) |
| `GEMINI_API_KEY` | clé Google AI Studio |
| `CLASSIFY_BATCH` | `25` |

3. **Deploy**. Vercel lance automatiquement la collecte une fois par jour.

### 4. Première collecte (manuelle)

Ouvrir cette adresse dans un navigateur (une exécution possible toutes les 90 minutes) :

```bash
curl "https://bubble-breaker-psi.vercel.app/api/cron?step=all"
```

### 5. Collecte automatique

Le fichier `.github/workflows/collecte.yml` lance la collecte toutes les 3 heures et le classement IA toutes les 2 heures, sans secret à configurer.

## Fichiers clés

| Fichier | Rôle |
| --- | --- |
| `supabase/seed.sql` | personnalités suivies et médias avec leur sensibilité |
| `src/lib/collect.ts` | lecture des flux RSS et de Google News |
| `src/lib/stories.ts` | regroupement en faits et score de viralité |
| `src/lib/classify.ts` | consigne et appel à l'IA |
| `src/app/p/[slug]/page.tsx` | écrans +, − et = |

Vérifier les flux RSS déclarés : `npm run check:sources`.

## Limites assumées

La presse n'est pas les réseaux sociaux : TikTok, Instagram, X et les messageries ne sont pas couverts dans cette version. Le classement des médias par sensibilité est une convention publiée sur la page Méthode.
