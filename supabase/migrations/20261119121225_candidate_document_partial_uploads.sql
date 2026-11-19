-- Allow professionals to submit only the documents they actually uploaded.
-- The server verifies each private object, sets its status, and preserves all
-- other documents as-is (including pending files).
create or replace function public.update_candidate_documents(p_candidate_id text,p_documents jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  p public.profiles;
  c jsonb;
  old_docs jsonb;
  doc jsonb;
  base_doc jsonb;
  merged jsonb := '[]'::jsonb;
  file_path text;
  staff boolean;
  seen_names text[] := array[]::text[];
  updated_doc jsonb;
begin
  p := public.current_profile();
  if p.id is null then raise exception 'not authorized' using errcode='42501'; end if;
  staff := public.has_permission('candidatos');
  if p.role <> 'admin' and not staff and (p.role <> 'profissional' or p.candidate_id is distinct from p_candidate_id) then
    raise exception 'not authorized' using errcode='42501';
  end if;
  if coalesce(jsonb_typeof(p_documents),'') <> 'array' then raise exception 'documents must be an array'; end if;

  select x into c
  from jsonb_array_elements((select state->'candidatos' from public.crm_state where singleton)) x
  where x->>'id' = p_candidate_id
  limit 1;
  if c is null then raise exception 'candidate not found'; end if;
  old_docs := coalesce(c->'documentos','[]'::jsonb);

  if staff then
    if jsonb_array_length(p_documents) <> jsonb_array_length(old_docs) then raise exception 'document set cannot change'; end if;
  else
    -- A professional submits only changed uploads; leave every omitted item untouched.
    merged := old_docs;
    if jsonb_array_length(p_documents) > jsonb_array_length(old_docs) then raise exception 'document set cannot change'; end if;
  end if;

  for doc in select value from jsonb_array_elements(p_documents) loop
    if jsonb_typeof(doc) <> 'object'
      or nullif(doc->>'nome','') is null
      or not exists(select 1 from jsonb_array_elements(old_docs) o where o->>'nome' = doc->>'nome')
      or doc->>'nome' = any(seen_names) then
      raise exception 'invalid or duplicate document';
    end if;
    seen_names := array_append(seen_names, doc->>'nome');
    select o into base_doc from jsonb_array_elements(old_docs) o where o->>'nome' = doc->>'nome' limit 1;

    file_path := null;
    if doc ? 'arquivoId' and nullif(doc->>'arquivoId','') is not null then
      file_path := doc->>'arquivoId';
      if split_part(file_path,'/',1) <> p_candidate_id
        or position('/' in file_path) = 0
        or not exists(select 1 from storage.objects o where o.bucket_id = 'professional-documents' and o.name = file_path) then
        raise exception 'invalid document object';
      end if;
    end if;

    if not staff then
      if (doc-'nome'-'arquivoId'-'arquivoNome'-'arquivoTipo'-'arquivoTamanho'-'enviadoEm') <> '{}'::jsonb then
        raise exception 'forbidden document fields' using errcode='42501';
      end if;
      if file_path is null then raise exception 'file required'; end if;
      updated_doc := base_doc || (doc-'nome'-'enviadoEm') || jsonb_build_object('status','enviado','arquivoId',file_path,'enviadoEm',now());
      select coalesce(
        jsonb_agg(case when existing.value->>'nome' = doc->>'nome' then updated_doc else existing.value end order by existing.ordinality),
        '[]'::jsonb
      ) into merged
      from jsonb_array_elements(merged) with ordinality as existing(value,ordinality);
    else
      if (doc-'nome'-'status'-'arquivoId'-'arquivoNome'-'arquivoTipo'-'arquivoTamanho'-'enviadoEm') <> '{}'::jsonb
        or coalesce(doc->>'status','pendente') not in ('pendente','enviado','validado')
        or (coalesce(doc->>'status','pendente') <> 'pendente' and file_path is null) then
        raise exception 'invalid document review';
      end if;
      merged := merged || jsonb_build_array(base_doc||doc);
    end if;
  end loop;

  update public.crm_state
  set state = jsonb_set(
        state,
        '{candidatos}',
        (select jsonb_agg(case when x->>'id' = p_candidate_id then jsonb_set(x,'{documentos}',merged,true)||jsonb_build_object('atualizadoEm',now()) else x end)
         from jsonb_array_elements(state->'candidatos') x),
        true
      ),
      updated_at = now()
  where singleton;
  return jsonb_build_object('ok',true);
end $$;
