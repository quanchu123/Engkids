alter table if exists public.word_bank_items
  add column if not exists vi_source_id text,
  add column if not exists vi_source_url text,
  add column if not exists vi_license_name text,
  add column if not exists vi_license_url text,
  add column if not exists vi_attribution text,
  add column if not exists vi_confidence numeric,
  add column if not exists vi_review_status text not null default 'needs-review',
  add column if not exists vi_updated_at timestamptz;

alter table if exists public.word_bank_items
  drop constraint if exists word_bank_items_vi_review_status_check;

alter table if exists public.word_bank_items
  add constraint word_bank_items_vi_review_status_check
  check (vi_review_status in ('approved', 'needs-review', 'blocked', 'translation_pending'));

update public.word_bank_items
set
  vi_review_status = 'translation_pending',
  vi_confidence = coalesce(vi_confidence, 0),
  vi_updated_at = coalesce(vi_updated_at, now())
where active = true
  and (vi is null or btrim(vi) = '' or lower(btrim(vi)) = 'translation_pending');

update public.word_bank_items
set
  vi_review_status = case
    when lower(coalesce(quality_status, 'approved')) = 'blocked' then 'blocked'
    when lower(btrim(coalesce(vi, ''))) = 'translation_pending' then 'translation_pending'
    when btrim(coalesce(vi, '')) ~* '^(t?|tính t?|d?ng t?) ' then 'needs-review'
    else 'approved'
  end,
  vi_source_id = coalesce(vi_source_id, source_id, source),
  vi_license_name = coalesce(vi_license_name, license_name, license_status),
  vi_license_url = coalesce(vi_license_url, source_url),
  vi_attribution = coalesce(vi_attribution, attribution, source_id, source),
  vi_confidence = coalesce(vi_confidence, case when btrim(coalesce(vi, '')) ~* '^(t?|tính t?|d?ng t?) ' then 0.35 else 0.75 end),
  vi_updated_at = coalesce(vi_updated_at, now())
where active = true
  and vi is not null
  and btrim(vi) <> ''
  and lower(btrim(vi)) <> 'translation_pending';

create index if not exists idx_word_bank_items_vi_review_status
  on public.word_bank_items(vi_review_status);

create index if not exists idx_word_bank_items_vi_source_id
  on public.word_bank_items(vi_source_id);