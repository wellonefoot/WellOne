-- WellOne v108 customer search update
-- Full-word storefront search + exact barcode/ID search.
-- Run once in Supabase SQL Editor. Safe to run again.

create or replace function public.strict_product_search_ids(p_query text, p_category_id uuid default null)
returns table(id uuid)
language sql
security definer
stable
set search_path=public,extensions
as $$
  with q as (
    select trim(coalesce(p_query,'')) as raw_query,
           plainto_tsquery('simple', trim(coalesce(p_query,''))) as word_query
  )
  select p.id
  from public.products p,q
  where coalesce(p.status,'active')='active'
    and (p_category_id is null or p.category_id=p_category_id)
    and q.raw_query<>''
    and (
      to_tsvector('simple', concat_ws(' ', coalesce(p.name,''), coalesce(p.description,''), coalesce(p.search_keywords,''))) @@ q.word_query
      or lower(trim(coalesce(p.barcode,''))) = lower(q.raw_query)
      or lower(p.id::text) = lower(q.raw_query)
    )
  limit 5000;
$$;
revoke all on function public.strict_product_search_ids(text,uuid) from public;
grant execute on function public.strict_product_search_ids(text,uuid) to anon, authenticated;
