-- WellOne v109 customer search update
-- Keeps full-word matching strict, but ignores spacing between complete search terms.
-- Examples:
--   lipbalm      -> Lip Balm
--   lip balm     -> LipBalm
--   washableshoe -> Washable Shoe
--   lip          -X-> Slipper
-- Barcode and UUID lookup remain supported.
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
           plainto_tsquery('simple', trim(coalesce(p_query,''))) as word_query,
           regexp_replace(lower(trim(coalesce(p_query,''))), '[^[:alnum:]]+', '', 'g') as compact_query
  )
  select p.id
  from public.products p,q
  where coalesce(p.status,'active')='active'
    and (p_category_id is null or p.category_id=p_category_id)
    and q.raw_query<>''
    and (
      to_tsvector('simple', concat_ws(' ', coalesce(p.name,''), coalesce(p.description,''), coalesce(p.search_keywords,''))) @@ q.word_query
      -- This compact comparison deliberately returns broad candidates. The customer
      -- JS performs the final strict contiguous-token equality check, preventing
      -- short terms such as "lip" from matching inside "slipper".
      or (
        q.compact_query<>''
        and regexp_replace(lower(concat_ws(' ', coalesce(p.name,''), coalesce(p.description,''), coalesce(p.search_keywords,''))), '[^[:alnum:]]+', '', 'g') like '%' || q.compact_query || '%'
      )
      or regexp_replace(lower(coalesce(p.barcode,'')), '[^[:alnum:]]+', '', 'g') = q.compact_query
      or lower(p.id::text) = lower(q.raw_query)
    )
  limit 5000;
$$;
revoke all on function public.strict_product_search_ids(text,uuid) from public;
grant execute on function public.strict_product_search_ids(text,uuid) to anon, authenticated;
