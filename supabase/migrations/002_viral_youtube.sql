-- Bubble Breaker : contenus viraux et vidéos YouTube
alter table articles add column if not exists kind text not null default 'article';
alter table articles add column if not exists social boolean not null default false;
alter table articles add column if not exists video_id text;
alter table articles add column if not exists views bigint;
alter table articles add column if not exists likes bigint;
alter table articles add column if not exists thumbnail text;
create index if not exists articles_video_idx on articles (video_id) where video_id is not null;

create or replace view feed as
select
  m.personality_id, m.stance, m.confidence, m.satire, m.argument, m.justification, m.summary_fr,
  a.id as article_id, a.url, a.title, a.excerpt, a.source_name, a.domain, a.published_at,
  s.leaning,
  st.id as story_id, st.score as story_score, st.is_viral, st.source_count, st.leaning_count,
  a.kind, a.social, a.video_id, a.views, a.likes, a.thumbnail
from mentions m
join articles a on a.id = m.article_id
left join sources s on s.id = a.source_id
left join stories st on st.id = m.story_id
where m.classified_at is not null;

alter view feed set (security_invoker = true);
