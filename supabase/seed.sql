-- Bubble Breaker : données de départ
-- Personnalités et médias. Liste provisoire, à valider.
-- Le classement des médias par sensibilité éditoriale est public dans l'application (page Méthode).

-- ---------------------------------------------------------------
-- Personnalités (règle d'entrée : chef de parti, chef d'État ou de
-- gouvernement, ou candidat déclaré à une élection nationale)
-- ---------------------------------------------------------------
insert into personalities (slug, first_name, last_name, country, role, search_terms, news_editions) values
  ('emmanuel-macron',   'Emmanuel',  'MACRON',     'FR', 'Président de la République',        '{"Macron"}',                                  '{fr}'),
  ('marine-le-pen',     'Marine',    'LE PEN',     'FR', 'Rassemblement national',            '{"Marine Le Pen","Le Pen"}',                  '{fr}'),
  ('jordan-bardella',   'Jordan',    'BARDELLA',   'FR', 'Président du Rassemblement national','{"Bardella"}',                               '{fr}'),
  ('jean-luc-melenchon','Jean-Luc',  'MÉLENCHON',  'FR', 'La France insoumise',               '{"Mélenchon","Melenchon"}',                   '{fr}'),
  ('edouard-philippe',  'Édouard',   'PHILIPPE',   'FR', 'Horizons',                          '{"Édouard Philippe","Edouard Philippe"}',     '{fr}'),
  ('gabriel-attal',     'Gabriel',   'ATTAL',      'FR', 'Renaissance',                       '{"Attal"}',                                   '{fr}'),
  ('raphael-glucksmann','Raphaël',   'GLUCKSMANN', 'FR', 'Place publique',                    '{"Glucksmann"}',                              '{fr}'),
  ('bruno-retailleau',  'Bruno',     'RETAILLEAU', 'FR', 'Les Républicains',                  '{"Retailleau"}',                              '{fr}'),
  ('eric-zemmour',      'Éric',      'ZEMMOUR',    'FR', 'Reconquête',                        '{"Zemmour"}',                                 '{fr}'),
  ('marine-tondelier',  'Marine',    'TONDELIER',  'FR', 'Les Écologistes',                   '{"Tondelier"}',                               '{fr}'),
  ('fabien-roussel',    'Fabien',    'ROUSSEL',    'FR', 'Parti communiste français',         '{"Fabien Roussel"}',                          '{fr}'),
  ('donald-trump',      'Donald',    'TRUMP',      'US', 'Président des États-Unis',          '{"Trump"}',                                   '{fr,en}'),
  ('lula',              'Luiz Inácio','LULA DA SILVA','BR','Président du Brésil',             '{"Lula"}',                                    '{fr,pt}'),
  ('flavio-bolsonaro',  'Flávio',    'BOLSONARO',  'BR', 'Parti libéral, candidat 2026',      '{"Flávio Bolsonaro","Flavio Bolsonaro"}',     '{fr,pt}'),
  ('javier-milei',      'Javier',    'MILEI',      'AR', 'Président de l''Argentine',         '{"Milei"}',                                   '{fr,es}'),
  ('giorgia-meloni',    'Giorgia',   'MELONI',     'IT', 'Présidente du Conseil italien',     '{"Meloni"}',                                  '{fr,it}'),
  ('volodymyr-zelensky','Volodymyr', 'ZELENSKY',   'UA', 'Président de l''Ukraine',           '{"Zelensky","Zelenskyy","Zelenski"}',         '{fr,en}'),
  ('vladimir-poutine',  'Vladimir',  'POUTINE',    'RU', 'Président de la Russie',            '{"Poutine","Putin"}',                         '{fr,en}'),
  ('keir-starmer',      'Keir',      'STARMER',    'GB', 'Premier ministre britannique',      '{"Starmer"}',                                 '{fr,en}'),
  ('friedrich-merz',    'Friedrich', 'MERZ',       'DE', 'Chancelier fédéral allemand',       '{"Merz"}',                                    '{fr,de}')
on conflict (slug) do nothing;

-- ---------------------------------------------------------------
-- Médias. feed_url = flux RSS direct (vérifiable avec : npm run check:sources).
-- Les médias sans flux sont tout de même reconnus via Google News.
-- ---------------------------------------------------------------
insert into sources (domain, name, country, leaning, feed_url) values
  -- France, gauche
  ('humanite.fr',          'L''Humanité',       'FR', 'gauche',        'https://www.humanite.fr/feed'),
  ('liberation.fr',        'Libération',        'FR', 'gauche',        'https://www.liberation.fr/arc/outboundfeeds/rss-all/collection/accueil-une/?outputType=xml'),
  ('mediapart.fr',         'Mediapart',         'FR', 'gauche',        'https://www.mediapart.fr/articles/feed'),
  ('reporterre.net',       'Reporterre',        'FR', 'gauche',        'https://reporterre.net/spip.php?page=backend'),
  ('politis.fr',           'Politis',           'FR', 'gauche',        null),
  ('blast-info.fr',        'Blast',             'FR', 'gauche',        null),
  ('lemediatv.fr',         'Le Média',          'FR', 'gauche',        null),
  -- France, centre-gauche
  ('lemonde.fr',           'Le Monde',          'FR', 'centre-gauche', 'https://www.lemonde.fr/politique/rss_full.xml'),
  ('nouvelobs.com',        'L''Obs',            'FR', 'centre-gauche', 'https://www.nouvelobs.com/politique/rss.xml'),
  ('huffingtonpost.fr',    'HuffPost',          'FR', 'centre-gauche', null),
  ('telerama.fr',          'Télérama',          'FR', 'centre-gauche', null),
  -- France, centre
  ('francetvinfo.fr',      'franceinfo',        'FR', 'centre',        'https://www.francetvinfo.fr/politique.rss'),
  ('radiofrance.fr',       'Radio France',      'FR', 'centre',        null),
  ('20minutes.fr',         '20 Minutes',        'FR', 'centre',        'https://www.20minutes.fr/feeds/rss-politique.xml'),
  ('bfmtv.com',            'BFMTV',             'FR', 'centre',        'https://www.bfmtv.com/rss/politique/'),
  ('leparisien.fr',        'Le Parisien',       'FR', 'centre',        'https://feeds.leparisien.fr/leparisien/rss/politique'),
  ('ouest-france.fr',      'Ouest-France',      'FR', 'centre',        null),
  ('tf1info.fr',           'TF1 Info',          'FR', 'centre',        null),
  ('lci.fr',               'LCI',               'FR', 'centre',        null),
  ('rtl.fr',               'RTL',               'FR', 'centre',        null),
  ('lexpress.fr',          'L''Express',        'FR', 'centre',        null),
  ('marianne.net',         'Marianne',          'FR', 'centre',        'https://www.marianne.net/rss.xml'),
  ('publicsenat.fr',       'Public Sénat',      'FR', 'centre',        null),
  -- France, centre-droit
  ('lepoint.fr',           'Le Point',          'FR', 'centre-droit',  'https://www.lepoint.fr/politique/rss.xml'),
  ('lopinion.fr',          'L''Opinion',        'FR', 'centre-droit',  null),
  ('lesechos.fr',          'Les Échos',         'FR', 'centre-droit',  null),
  ('atlantico.fr',         'Atlantico',         'FR', 'centre-droit',  null),
  -- France, droite
  ('lefigaro.fr',          'Le Figaro',         'FR', 'droite',        'https://www.lefigaro.fr/rss/figaro_politique.xml'),
  ('cnews.fr',             'CNews',             'FR', 'droite',        null),
  ('europe1.fr',           'Europe 1',          'FR', 'droite',        null),
  ('lejdd.fr',             'Le JDD',            'FR', 'droite',        null),
  ('valeursactuelles.com', 'Valeurs actuelles', 'FR', 'droite',        'https://www.valeursactuelles.com/feed'),
  ('causeur.fr',           'Causeur',           'FR', 'droite',        'https://www.causeur.fr/feed'),
  ('bvoltaire.fr',         'Boulevard Voltaire','FR', 'droite',        'https://www.bvoltaire.fr/feed/'),
  ('frontpopulaire.fr',    'Front populaire',   'FR', 'droite',        null),
  -- États-Unis
  ('msnbc.com',            'MSNBC',             'US', 'gauche',        null),
  ('huffpost.com',         'HuffPost US',       'US', 'gauche',        null),
  ('nytimes.com',          'The New York Times','US', 'centre-gauche', null),
  ('washingtonpost.com',   'The Washington Post','US','centre-gauche', null),
  ('cnn.com',              'CNN',               'US', 'centre-gauche', null),
  ('npr.org',              'NPR',               'US', 'centre-gauche', null),
  ('apnews.com',           'AP News',           'US', 'centre',        null),
  ('reuters.com',          'Reuters',           'US', 'centre',        null),
  ('axios.com',            'Axios',             'US', 'centre',        null),
  ('politico.com',         'Politico',          'US', 'centre',        null),
  ('wsj.com',              'The Wall Street Journal','US','centre-droit',null),
  ('foxnews.com',          'Fox News',          'US', 'droite',        null),
  ('nypost.com',           'New York Post',     'US', 'droite',        null),
  ('breitbart.com',        'Breitbart',         'US', 'droite',        null),
  ('dailywire.com',        'The Daily Wire',    'US', 'droite',        null),
  ('newsmax.com',          'Newsmax',           'US', 'droite',        null),
  ('washingtonexaminer.com','Washington Examiner','US','droite',       null),
  -- Royaume-Uni
  ('theguardian.com',      'The Guardian',      'GB', 'centre-gauche', null),
  ('independent.co.uk',    'The Independent',   'GB', 'centre-gauche', null),
  ('bbc.com',              'BBC',               'GB', 'centre',        null),
  ('bbc.co.uk',            'BBC',               'GB', 'centre',        null),
  ('telegraph.co.uk',      'The Telegraph',     'GB', 'droite',        null),
  ('dailymail.co.uk',      'Daily Mail',        'GB', 'droite',        null),
  -- Brésil
  ('brasil247.com',        'Brasil 247',        'BR', 'gauche',        null),
  ('cartacapital.com.br',  'CartaCapital',      'BR', 'gauche',        null),
  ('folha.uol.com.br',     'Folha de S.Paulo',  'BR', 'centre-gauche', null),
  ('g1.globo.com',         'g1',                'BR', 'centre',        null),
  ('oglobo.globo.com',     'O Globo',           'BR', 'centre',        null),
  ('estadao.com.br',       'Estadão',           'BR', 'centre-droit',  null),
  ('gazetadopovo.com.br',  'Gazeta do Povo',    'BR', 'droite',        null),
  ('revistaoeste.com',     'Revista Oeste',     'BR', 'droite',        null),
  ('jovempan.com.br',      'Jovem Pan',         'BR', 'droite',        null),
  -- Argentine
  ('pagina12.com.ar',      'Página/12',         'AR', 'gauche',        null),
  ('infobae.com',          'Infobae',           'AR', 'centre',        null),
  ('clarin.com',           'Clarín',            'AR', 'centre-droit',  null),
  ('lanacion.com.ar',      'La Nación',         'AR', 'centre-droit',  null),
  -- Italie
  ('ilfattoquotidiano.it', 'Il Fatto Quotidiano','IT','gauche',        null),
  ('repubblica.it',        'la Repubblica',     'IT', 'centre-gauche', null),
  ('corriere.it',          'Corriere della Sera','IT','centre',        null),
  ('ilgiornale.it',        'il Giornale',       'IT', 'droite',        null),
  ('liberoquotidiano.it',  'Libero',            'IT', 'droite',        null),
  -- Allemagne
  ('taz.de',               'taz',               'DE', 'gauche',        null),
  ('spiegel.de',           'Der Spiegel',       'DE', 'centre-gauche', null),
  ('sueddeutsche.de',      'Süddeutsche Zeitung','DE','centre-gauche', null),
  ('tagesschau.de',        'Tagesschau',        'DE', 'centre',        null),
  ('faz.net',              'FAZ',               'DE', 'centre-droit',  null),
  ('welt.de',              'Die Welt',          'DE', 'centre-droit',  null),
  ('bild.de',              'Bild',              'DE', 'droite',        null)
on conflict (domain) do nothing;
