/**
 * Personnalités suivies : source unique, synchronisée automatiquement avec la base
 * à chaque exécution de la collecte. Pour en ajouter une, il suffit d'ajouter une ligne ici.
 *
 * wiki : titre de l'article Wikipédia en français, utilisé pour le portrait (Wikimedia Commons).
 * editions : éditions Google News interrogées (fr, en, pt, es, it, de).
 */
export interface PersonalityDef {
  slug: string;
  first_name: string;
  last_name: string;
  country: string;
  role: string;
  search_terms: string[];
  news_editions: string[];
  wiki: string;
}

export const PERSONALITIES: PersonalityDef[] = [
  // France
  { slug: "emmanuel-macron", first_name: "Emmanuel", last_name: "MACRON", country: "FR", role: "Président de la République", search_terms: ["Macron"], news_editions: ["fr"], wiki: "Emmanuel_Macron" },
  { slug: "marine-le-pen", first_name: "Marine", last_name: "LE PEN", country: "FR", role: "Rassemblement national", search_terms: ["Marine Le Pen", "Le Pen"], news_editions: ["fr"], wiki: "Marine_Le_Pen" },
  { slug: "jordan-bardella", first_name: "Jordan", last_name: "BARDELLA", country: "FR", role: "Président du Rassemblement national", search_terms: ["Bardella"], news_editions: ["fr"], wiki: "Jordan_Bardella" },
  { slug: "jean-luc-melenchon", first_name: "Jean-Luc", last_name: "MÉLENCHON", country: "FR", role: "La France insoumise", search_terms: ["Mélenchon", "Melenchon"], news_editions: ["fr"], wiki: "Jean-Luc_Mélenchon" },
  { slug: "rima-hassan", first_name: "Rima", last_name: "HASSAN", country: "FR", role: "Députée européenne, La France insoumise", search_terms: ["Rima Hassan"], news_editions: ["fr"], wiki: "Rima_Hassan" },
  { slug: "edouard-philippe", first_name: "Édouard", last_name: "PHILIPPE", country: "FR", role: "Horizons", search_terms: ["Édouard Philippe", "Edouard Philippe"], news_editions: ["fr"], wiki: "Édouard_Philippe" },
  { slug: "gabriel-attal", first_name: "Gabriel", last_name: "ATTAL", country: "FR", role: "Renaissance", search_terms: ["Attal"], news_editions: ["fr"], wiki: "Gabriel_Attal" },
  { slug: "raphael-glucksmann", first_name: "Raphaël", last_name: "GLUCKSMANN", country: "FR", role: "Place publique", search_terms: ["Glucksmann"], news_editions: ["fr"], wiki: "Raphaël_Glucksmann" },
  { slug: "bruno-retailleau", first_name: "Bruno", last_name: "RETAILLEAU", country: "FR", role: "Les Républicains", search_terms: ["Retailleau"], news_editions: ["fr"], wiki: "Bruno_Retailleau" },
  { slug: "eric-zemmour", first_name: "Éric", last_name: "ZEMMOUR", country: "FR", role: "Reconquête", search_terms: ["Zemmour"], news_editions: ["fr"], wiki: "Éric_Zemmour" },
  { slug: "marine-tondelier", first_name: "Marine", last_name: "TONDELIER", country: "FR", role: "Les Écologistes", search_terms: ["Tondelier"], news_editions: ["fr"], wiki: "Marine_Tondelier" },
  { slug: "fabien-roussel", first_name: "Fabien", last_name: "ROUSSEL", country: "FR", role: "Parti communiste français", search_terms: ["Fabien Roussel"], news_editions: ["fr"], wiki: "Fabien_Roussel" },
  // International
  { slug: "donald-trump", first_name: "Donald", last_name: "TRUMP", country: "US", role: "Président des États-Unis", search_terms: ["Trump"], news_editions: ["fr", "en"], wiki: "Donald_Trump" },
  { slug: "lula", first_name: "Luiz Inácio", last_name: "LULA DA SILVA", country: "BR", role: "Président du Brésil", search_terms: ["Lula"], news_editions: ["fr", "pt"], wiki: "Luiz_Inácio_Lula_da_Silva" },
  { slug: "flavio-bolsonaro", first_name: "Flávio", last_name: "BOLSONARO", country: "BR", role: "Parti libéral, candidat 2026", search_terms: ["Flávio Bolsonaro", "Flavio Bolsonaro"], news_editions: ["fr", "pt"], wiki: "Flávio_Bolsonaro" },
  { slug: "javier-milei", first_name: "Javier", last_name: "MILEI", country: "AR", role: "Président de l'Argentine", search_terms: ["Milei"], news_editions: ["fr", "es"], wiki: "Javier_Milei" },
  { slug: "giorgia-meloni", first_name: "Giorgia", last_name: "MELONI", country: "IT", role: "Présidente du Conseil italien", search_terms: ["Meloni"], news_editions: ["fr", "it"], wiki: "Giorgia_Meloni" },
  { slug: "volodymyr-zelensky", first_name: "Volodymyr", last_name: "ZELENSKY", country: "UA", role: "Président de l'Ukraine", search_terms: ["Zelensky", "Zelenskyy", "Zelenski"], news_editions: ["fr", "en"], wiki: "Volodymyr_Zelensky" },
  { slug: "vladimir-poutine", first_name: "Vladimir", last_name: "POUTINE", country: "RU", role: "Président de la Russie", search_terms: ["Poutine", "Putin"], news_editions: ["fr", "en"], wiki: "Vladimir_Poutine" },
  { slug: "keir-starmer", first_name: "Keir", last_name: "STARMER", country: "GB", role: "Premier ministre britannique", search_terms: ["Starmer"], news_editions: ["fr", "en"], wiki: "Keir_Starmer" },
  { slug: "friedrich-merz", first_name: "Friedrich", last_name: "MERZ", country: "DE", role: "Chancelier fédéral allemand", search_terms: ["Merz"], news_editions: ["fr", "de"], wiki: "Friedrich_Merz" },
];

export const COUNTRIES: Record<string, string> = {
  FR: "France",
  US: "États-Unis",
  BR: "Brésil",
  AR: "Argentine",
  IT: "Italie",
  UA: "Ukraine",
  RU: "Russie",
  GB: "Royaume-Uni",
  DE: "Allemagne",
};
