-- Bubble Breaker : recherche libre de personnalités et titres en français
alter table articles add column if not exists title_fr text;
alter table personalities add column if not exists wiki text;
alter table personalities add column if not exists wikidata text;
alter table personalities add column if not exists origin text not null default 'curated';
alter table personalities add column if not exists last_viewed_at timestamptz;
create index if not exists personalities_wiki_idx on personalities (wiki);

create or replace view feed as
select
  m.personality_id, m.stance, m.confidence, m.satire, m.argument, m.justification, m.summary_fr,
  a.id as article_id, a.url, a.title, a.excerpt, a.source_name, a.domain, a.published_at,
  s.leaning,
  st.id as story_id, st.score as story_score, st.is_viral, st.source_count, st.leaning_count,
  a.kind, a.social, a.video_id, a.views, a.likes, a.thumbnail,
  a.title_fr
from mentions m
join articles a on a.id = m.article_id
left join sources s on s.id = a.source_id
left join stories st on st.id = m.story_id
where m.classified_at is not null;

alter view feed set (security_invoker = true);
