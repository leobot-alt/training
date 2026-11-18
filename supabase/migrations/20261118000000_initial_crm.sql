-- Somente CRM: private JSON state + authorization boundary. No sample people/admin.
begin;
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'profissional' check (role in ('admin','equipe','profissional')),
  permissions jsonb not null default '{}'::jsonb check (jsonb_typeof(permissions) = 'object'),
  candidate_id text unique,
  active boolean not null default true,
  nome text not null default '', email text not null default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists profiles_candidate_idx on public.profiles(candidate_id);
alter table public.profiles enable row level security;
drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles for select to authenticated using (id = (select auth.uid()));
revoke all on public.profiles from public, anon, authenticated;
grant select on public.profiles to authenticated;

create table if not exists public.crm_state (
  singleton boolean primary key default true check (singleton),
  state jsonb not null default '{"candidatos":[],"trilhas":[],"progresso":{},"pipelineStages":[],"solicitacoes":[],"homeContent":{},"trainingFlow":[],"teamAccounts":[]}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.crm_state(singleton,state) values (true,jsonb_build_object(
  'candidatos','[]'::jsonb,
  'trilhas','[]'::jsonb,
  'progresso','{}'::jsonb,
  'pipelineStages',jsonb_build_array(
    jsonb_build_object('status','novo','label','Novo','enabled',true,'order',0),
    jsonb_build_object('status','triagem','label','Triagem','enabled',true,'order',1),
    jsonb_build_object('status','entrevista','label','Entrevista','enabled',true,'order',2),
    jsonb_build_object('status','documentacao','label','Documentação','enabled',true,'order',3),
    jsonb_build_object('status','aprovado','label','Aprovado','enabled',true,'order',4),
    jsonb_build_object('status','ativo','label','Ativo','enabled',true,'order',5),
    jsonb_build_object('status','reprovado','label','Não aprovado','enabled',true,'order',6)
  ),
  'solicitacoes','[]'::jsonb,
  'homeContent','{}'::jsonb,
  'trainingFlow',jsonb_build_array(
    jsonb_build_object('id','pre-cadastro','title','Pré-cadastro recebido','description','O profissional preenche seus dados e envia a documentação inicial pelo portal.','owner','Equipe de recrutamento','timing','Dia 0','checklist',jsonb_build_array('Conferir se o cadastro foi enviado','Verificar se os documentos obrigatórios foram anexados','Confirmar que o profissional recebeu o protocolo')),
    jsonb_build_object('id','triagem','title','Triagem cadastral e documental','description','Validar dados, registro profissional, formação e documentos antes de avançar.','owner','Equipe de recrutamento','timing','Até 3 dias úteis','checklist',jsonb_build_array('Conferir CPF e dados de contato','Validar CRP/CRM e situação do registro','Revisar diploma e certificados','Solicitar correções, se necessário')),
    jsonb_build_object('id','entrevista','title','Entrevista e alinhamento','description','Realizar conversa com o profissional para conhecer a experiência clínica, abordagem e disponibilidade.','owner','Recrutador responsável','timing','Após aprovação da triagem','checklist',jsonb_build_array('Agendar entrevista','Registrar parecer interno','Alinhar funcionamento da plataforma e próximos passos')),
    jsonb_build_object('id','decisao','title','Decisão e aprovação','description','Registrar a decisão do processo seletivo e comunicar o resultado ao profissional.','owner','Coordenação clínica','timing','Após entrevista','checklist',jsonb_build_array('Revisar parecer e documentos','Atualizar etapa no pipeline','Enviar retorno ao profissional')),
    jsonb_build_object('id','configuracao','title','Configuração do perfil e agenda','description','Preparar o perfil de atendimento e orientar o profissional sobre o cadastro de disponibilidade.','owner','Operações','timing','Após aprovação','checklist',jsonb_build_array('Conferir dados do perfil','Confirmar permissão para edição de agenda','Verificar se a agenda foi preenchida corretamente')),
    jsonb_build_object('id','treinamento','title','Treinamento obrigatório','description','O profissional acessa as trilhas e aulas obrigatórias no painel. Acompanhar o progresso antes de liberar o atendimento.','owner','Treinamento / Operações','timing','Antes da ativação','checklist',jsonb_build_array('Liberar acesso às trilhas obrigatórias','Acompanhar conclusão das aulas','Confirmar conclusão do treinamento obrigatório')),
    jsonb_build_object('id','ativacao','title','Liberação para atendimento','description','Concluir a integração, ativar o profissional e confirmar que ele está apto a iniciar os atendimentos.','owner','Operações','timing','Após conclusão das etapas','checklist',jsonb_build_array('Confirmar documentação validada','Confirmar treinamento concluído','Atualizar status para ativo','Enviar orientações de início'))
  ),
  'teamAccounts','[]'::jsonb
)) on conflict (singleton) do nothing;
alter table public.crm_state enable row level security;
revoke all on public.crm_state from public, anon, authenticated;

create or replace function public.has_permission(p_key text) returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.active and
   (p.role='admin' or (p.role='equipe' and coalesce((p.permissions->>p_key)::boolean,false))))
$$;
create or replace function public.current_profile() returns public.profiles
language sql stable security definer set search_path = '' as $$
 select p from public.profiles p where p.id=(select auth.uid()) and p.active limit 1
$$;
revoke all on function public.has_permission(text),public.current_profile() from public,anon;
grant execute on function public.has_permission(text),public.current_profile() to authenticated;

create or replace function public.get_public_state() returns jsonb
language sql stable security definer set search_path = '' as $$
 select jsonb_build_object('homeContent',coalesce(state->'homeContent','{}'::jsonb)) from public.crm_state where singleton
$$;

create or replace function public.get_my_state() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare s jsonb; p public.profiles; out_state jsonb; arr jsonb;
begin
 p:=public.current_profile(); if p.id is null then raise exception 'not authorized' using errcode='42501'; end if;
 select state into s from public.crm_state where singleton;
 if p.role='admin' then
   out_state:=s-'teamAccounts';
	   return out_state||jsonb_build_object('user',jsonb_build_object('id',p.id,'role',p.role,'nome',p.nome,'email',p.email,'permissions',p.permissions),'teamAccounts',
	    coalesce((select jsonb_agg(jsonb_build_object('id',q.id,'nome',q.nome,'email',q.email,'permissions',q.permissions,'ativo',q.active,'criadoEm',q.created_at)) from public.profiles q where q.role='equipe'),'[]'::jsonb));
 end if;
 if p.role='profissional' then
   return jsonb_build_object(
    'candidatos',coalesce((select jsonb_agg(x) from jsonb_array_elements(coalesce(s->'candidatos','[]'::jsonb)) x where x->>'id'=p.candidate_id),'[]'::jsonb),
    'trilhas',coalesce(s->'trilhas','[]'::jsonb),
    'progresso',jsonb_build_object(p.candidate_id,coalesce(s->'progresso'->p.candidate_id,'{}'::jsonb)),
    'solicitacoes',coalesce((select jsonb_agg(x) from jsonb_array_elements(coalesce(s->'solicitacoes','[]'::jsonb)) x where x->>'candidatoId'=p.candidate_id),'[]'::jsonb),
    'pipelineStages','[]'::jsonb,'homeContent',coalesce(s->'homeContent','{}'::jsonb),'trainingFlow',coalesce(s->'trainingFlow','[]'::jsonb),
    'user',jsonb_build_object('id',p.id,'role',p.role,'nome',p.nome,'email',p.email,'candidatoId',p.candidate_id));
 end if;
 out_state:=jsonb_build_object('user',jsonb_build_object('id',p.id,'role',p.role,'nome',p.nome,'email',p.email,'permissions',p.permissions));
 if public.has_permission('candidatos') then out_state:=out_state||jsonb_build_object('candidatos',coalesce(s->'candidatos','[]'::jsonb));
 elsif public.has_permission('solicitacoes') then
   select coalesce(jsonb_agg(jsonb_build_object('id',x->'id','nome',x->'nome','status',x->'status','solicitacaoAtualizacao',x->'solicitacaoAtualizacao')),'[]'::jsonb) into arr
	   from jsonb_array_elements(coalesce(s->'candidatos','[]'::jsonb)) x
	   where x ? 'solicitacaoAtualizacao' or exists(
	     select 1 from jsonb_array_elements(coalesce(s->'solicitacoes','[]'::jsonb)) t
	     where t->>'candidatoId'=x->>'id'
	   );
   out_state:=out_state||jsonb_build_object('candidatos',coalesce(arr,'[]'::jsonb));
 elsif public.has_permission('pipeline') or public.has_permission('dashboard') or public.has_permission('treinamentos') then
   select coalesce(jsonb_agg(jsonb_build_object('id',x->'id','nome',x->'nome','status',x->'status')),'[]'::jsonb) into arr from jsonb_array_elements(coalesce(s->'candidatos','[]'::jsonb)) x;
   out_state:=out_state||jsonb_build_object('candidatos',coalesce(arr,'[]'::jsonb));
 end if;
 if public.has_permission('solicitacoes') then out_state:=out_state||jsonb_build_object('solicitacoes',coalesce(s->'solicitacoes','[]'::jsonb)); end if;
 if public.has_permission('pipeline') then out_state:=out_state||jsonb_build_object('pipelineStages',coalesce(s->'pipelineStages','[]'::jsonb)); end if;
 if public.has_permission('treinamentos') then out_state:=out_state||jsonb_build_object('trilhas',coalesce(s->'trilhas','[]'::jsonb),'progresso',coalesce(s->'progresso','{}'::jsonb)); end if;
 if public.has_permission('fluxo-treinamento') then out_state:=out_state||jsonb_build_object('trainingFlow',coalesce(s->'trainingFlow','[]'::jsonb)); end if;
 if public.has_permission('conteudo-home') then out_state:=out_state||jsonb_build_object('homeContent',coalesce(s->'homeContent','{}'::jsonb)); end if;
 if public.has_permission('usuarios') then
	   out_state:=out_state||jsonb_build_object('teamAccounts',coalesce((select jsonb_agg(jsonb_build_object('id',q.id,'nome',q.nome,'email',q.email,'permissions',q.permissions,'ativo',q.active,'criadoEm',q.created_at)) from public.profiles q where q.role='equipe'),'[]'::jsonb));
 end if;
 return out_state;
end $$;

-- save_my_state accepts one object argument p_patch containing only authorized sections.
create or replace function public.save_my_state(p_patch jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
		declare p public.profiles; s jsonb; k text; allowed boolean; cid text; progress jsonb; old_c jsonb; new_c jsonb; patch_c jsonb; req jsonb; candidate_deletions jsonb;
begin
 p:=public.current_profile(); if p.id is null or jsonb_typeof(p_patch)<>'object' then raise exception 'not authorized' using errcode='42501'; end if;
 if p_patch ?| array['user','teamAccounts','candidateUpdateRequests'] then raise exception 'forbidden field' using errcode='42501'; end if;
 select state into s from public.crm_state where singleton for update;
 for k in select jsonb_object_keys(p_patch) loop
  allowed:=false;
	  if p.role='admin' then allowed:=k in ('candidatos','candidateDeletes','trilhas','progresso','pipelineStages','solicitacoes','homeContent','trainingFlow','pipelineUpdates');
	  elsif p.role='equipe' then allowed:=(k in ('candidatos','candidateDeletes') and public.has_permission('candidatos')) or (k='pipelineUpdates' and public.has_permission('pipeline')) or (k='pipelineStages' and public.has_permission('pipeline')) or (k='solicitacoes' and public.has_permission('solicitacoes')) or (k in ('trilhas','progresso') and public.has_permission('treinamentos')) or (k='trainingFlow' and public.has_permission('fluxo-treinamento')) or (k='homeContent' and public.has_permission('conteudo-home'));
	  elsif p.role='profissional' then allowed:=k in ('progresso','candidatos','solicitacoes'); end if;
  if not allowed then raise exception 'forbidden section: %',k using errcode='42501'; end if;
 end loop;
 if p.role='profissional' then
  cid:=p.candidate_id; if cid is null then raise exception 'candidate not linked' using errcode='42501'; end if;
  if p_patch ? 'progresso' then
    progress:=p_patch->'progresso'; if jsonb_typeof(progress)<>'object' or (select count(*) from jsonb_object_keys(progress))<>1 or not (progress ? cid) or jsonb_typeof(progress->cid)<>'object' then raise exception 'invalid progress' using errcode='42501'; end if;
    s:=jsonb_set(s,array['progresso',cid],progress->cid,true);
  end if;
	  if p_patch ? 'candidatos' then
    if jsonb_typeof(p_patch->'candidatos')<>'array' or jsonb_array_length(p_patch->'candidatos')<>1 then raise exception 'invalid candidate update' using errcode='42501'; end if;
    patch_c:=p_patch->'candidatos'->0; if patch_c->>'id' is distinct from cid or (patch_c-'id'-'solicitacaoAtualizacao')<>'{}'::jsonb or not (patch_c ? 'solicitacaoAtualizacao') then raise exception 'only own update request allowed' using errcode='42501'; end if;
    req:=patch_c->'solicitacaoAtualizacao'; if jsonb_typeof(req)<>'object' or not (req ? 'dados') or not (req ? 'solicitadaEm') then raise exception 'invalid update request' using errcode='42501'; end if;
    select coalesce(jsonb_agg(case when x->>'id'=cid then x||jsonb_build_object('solicitacaoAtualizacao',req) else x end),'[]'::jsonb) into new_c from jsonb_array_elements(coalesce(s->'candidatos','[]'::jsonb)) x;
    if not exists(select 1 from jsonb_array_elements(coalesce(s->'candidatos','[]'::jsonb)) x where x->>'id'=cid) then raise exception 'candidate not found' using errcode='42501'; end if;
	    s:=jsonb_set(s,'{candidatos}',new_c,true);
	  end if;
	  if p_patch ? 'solicitacoes' then
	    if jsonb_typeof(p_patch->'solicitacoes')<>'array' then raise exception 'invalid solicitations' using errcode='42501'; end if;
	    for req in select value from jsonb_array_elements(p_patch->'solicitacoes') loop
	      if jsonb_typeof(req)<>'object' or (req-'id'-'candidatoId'-'tipo'-'mensagem'-'agenda'-'observacoesAgenda'-'criadaEm')<>'{}'::jsonb
	        or nullif(req->>'id','') is null or req->>'candidatoId' is distinct from cid
	        or req->>'tipo' is null or req->>'tipo' not in ('agenda','mensagem') or nullif(btrim(req->>'mensagem'),'') is null
	        or length(req->>'mensagem')>4000 or not (req ? 'criadaEm')
	        or (req->>'tipo'='agenda' and jsonb_typeof(req->'agenda')<>'array')
	        or (req ? 'agenda' and jsonb_typeof(req->'agenda')<>'array') then
	        raise exception 'invalid solicitation' using errcode='42501';
	      end if;
	      if exists(select 1 from jsonb_array_elements(coalesce(s->'solicitacoes','[]'::jsonb)) t where t->>'id'=req->>'id')
	        or (select count(*) from jsonb_array_elements(p_patch->'solicitacoes') u where u->>'id'=req->>'id')<>1 then
	        raise exception 'duplicate solicitation id' using errcode='42501';
	      end if;
	    end loop;
	    select coalesce(jsonb_agg(x||jsonb_build_object('status','pendente')),'[]'::jsonb) into new_c
	      from jsonb_array_elements(p_patch->'solicitacoes') x;
	    s:=jsonb_set(s,'{solicitacoes}',coalesce(s->'solicitacoes','[]'::jsonb)||new_c,true);
	  end if;
		 else
	  if p_patch ? 'candidatos' then
	   if jsonb_typeof(p_patch->'candidatos')<>'array' then raise exception 'invalid candidates' using errcode='42501'; end if;
	   if exists(select 1 from jsonb_array_elements(p_patch->'candidatos') as incoming(value) where nullif(incoming.value->>'id','') is null or not exists(select 1 from jsonb_array_elements(coalesce(s->'candidatos','[]'::jsonb)) as existing(value) where existing.value->>'id'=incoming.value->>'id')) or (select count(*) from jsonb_array_elements(p_patch->'candidatos'))<>(select count(distinct value->>'id') from jsonb_array_elements(p_patch->'candidatos') as incoming(value)) then raise exception 'candidate not found or duplicate' using errcode='42501'; end if;
	   select coalesce(jsonb_agg(case when incoming.value is not null then existing.value||incoming.value else existing.value end order by existing.ordinality),'[]'::jsonb) into new_c from jsonb_array_elements(coalesce(s->'candidatos','[]'::jsonb)) with ordinality as existing(value,ordinality) left join lateral (select item.value from jsonb_array_elements(p_patch->'candidatos') as item(value) where item.value->>'id'=existing.value->>'id' limit 1) incoming on true;
	   s:=jsonb_set(s,'{candidatos}',new_c,true);
	  end if;
	  if p_patch ? 'candidateDeletes' then
	   candidate_deletions:=p_patch->'candidateDeletes';
	   if jsonb_typeof(candidate_deletions)<>'array' or exists(select 1 from jsonb_array_elements(candidate_deletions) as deletion(value) where jsonb_typeof(deletion.value)<>'string' or not exists(select 1 from jsonb_array_elements(coalesce(s->'candidatos','[]'::jsonb)) as candidate(value) where candidate.value->>'id'=deletion.value #>> '{}')) or (select count(*) from jsonb_array_elements_text(candidate_deletions))<>(select count(distinct value) from jsonb_array_elements_text(candidate_deletions)) then raise exception 'invalid candidate deletions' using errcode='42501'; end if;
	   update public.profiles set active=false,updated_at=now() where candidate_id in (select deleted.value from jsonb_array_elements_text(candidate_deletions) as deleted(value));
	   select coalesce(jsonb_agg(c),'[]'::jsonb) into new_c from jsonb_array_elements(coalesce(s->'candidatos','[]'::jsonb)) c where not exists(select 1 from jsonb_array_elements_text(candidate_deletions) as deleted(value) where deleted.value=c->>'id');
	   s:=jsonb_set(s,'{candidatos}',new_c,true);
	  end if;
	  if p_patch ? 'pipelineUpdates' then
   if jsonb_typeof(p_patch->'pipelineUpdates')<>'array' then raise exception 'invalid pipeline updates' using errcode='42501'; end if;
   for req in select value from jsonb_array_elements(p_patch->'pipelineUpdates') loop
    if not (req ? 'id') or not (req ? 'status') or (req-'id'-'status')<>'{}'::jsonb or req->>'status' not in ('novo','triagem','entrevista','documentacao','aprovado','ativo','reprovado') then raise exception 'invalid pipeline update' using errcode='42501'; end if;
   end loop;
   select coalesce(jsonb_agg(case when exists(select 1 from jsonb_array_elements(p_patch->'pipelineUpdates') u where u->>'id'=c->>'id') then c||jsonb_build_object('status',(select u->'status' from jsonb_array_elements(p_patch->'pipelineUpdates') u where u->>'id'=c->>'id' limit 1),'atualizadoEm',to_jsonb(now())) else c end),'[]'::jsonb) into new_c from jsonb_array_elements(coalesce(s->'candidatos','[]'::jsonb)) c;
   s:=jsonb_set(s,'{candidatos}',new_c,true);
  end if;
	  for k in select jsonb_object_keys(p_patch) where k not in ('pipelineUpdates','candidatos','candidateDeletes') loop s:=jsonb_set(s,array[k],p_patch->k,true); end loop;
 end if;
 update public.crm_state set state=s,updated_at=now() where singleton; return jsonb_build_object('ok',true);
end $$;

create or replace function public.review_candidate_update(p_candidate_id text,p_approved boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s jsonb; c jsonb; req jsonb; changes jsonb; fields text[]:=array['nome','cpf','rg','sexo','dataNascimento','email','emailTeams','telefone','cep','endereco','numero','chavePix','cidade','uf','profissao','registro','especialidades','abordagem','experienciaAnos','bio','agenda','observacoesAgenda']; patch jsonb;
begin
 if not public.has_permission('solicitacoes') then raise exception 'not authorized' using errcode='42501'; end if;
 select state into s from public.crm_state where singleton for update;
 select x into c from jsonb_array_elements(coalesce(s->'candidatos','[]'::jsonb)) x where x->>'id'=p_candidate_id limit 1;
 if c is null or not (c ? 'solicitacaoAtualizacao') or c->'solicitacaoAtualizacao'='null'::jsonb then raise exception 'request not found'; end if;
 req:=c->'solicitacaoAtualizacao'; changes:=req->'dados';
 if jsonb_typeof(changes)<>'object' then raise exception 'invalid request'; end if;
 if p_approved then
   select coalesce(jsonb_object_agg(key,value),'{}'::jsonb) into patch from jsonb_each(changes) where key=any(fields);
   select coalesce(jsonb_agg(case when x->>'id'=p_candidate_id then (x||patch)-'solicitacaoAtualizacao'||jsonb_build_object('atualizadoEm',now()) else x end),'[]'::jsonb) into changes from jsonb_array_elements(s->'candidatos') x;
 else
   select coalesce(jsonb_agg(case when x->>'id'=p_candidate_id then (x-'solicitacaoAtualizacao')||jsonb_build_object('atualizadoEm',now()) else x end),'[]'::jsonb) into changes from jsonb_array_elements(s->'candidatos') x;
 end if;
 update public.crm_state set state=jsonb_set(s,'{candidatos}',changes,true),updated_at=now() where singleton;
	 return jsonb_build_object('ok',true,'approved',p_approved);
end $$;

-- Resolve a stored solicitation; p_ticket_id identifies it, p_outcome is 'atendida' or 'recusada', and p_resposta_equipe is optional.
create or replace function public.resolve_solicitation(p_ticket_id text,p_outcome text,p_resposta_equipe text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s jsonb; ticket jsonb; updated_ticket jsonb; candidate jsonb; ticket_id text; candidate_id text; tickets jsonb; candidates jsonb;
begin
 if not public.has_permission('solicitacoes') then raise exception 'not authorized' using errcode='42501'; end if;
 if p_outcome is null or p_outcome not in ('atendida','recusada') then raise exception 'invalid solicitation outcome'; end if;
 select state into s from public.crm_state where singleton for update;
 select x into ticket from jsonb_array_elements(coalesce(s->'solicitacoes','[]'::jsonb)) x where x->>'id'=p_ticket_id limit 1;
 if ticket is null then raise exception 'solicitation not found'; end if;
 if ticket->>'status' is distinct from 'pendente' then raise exception 'solicitation is not pending'; end if;
 ticket_id:=ticket->>'id'; candidate_id:=ticket->>'candidatoId';
 updated_ticket:=ticket||jsonb_build_object('status',p_outcome,'respondidaEm',now());
 if p_resposta_equipe is not null then updated_ticket:=updated_ticket||jsonb_build_object('respostaEquipe',p_resposta_equipe); end if;
 select coalesce(jsonb_agg(case when x->>'id'=ticket_id then updated_ticket else x end),'[]'::jsonb) into tickets from jsonb_array_elements(coalesce(s->'solicitacoes','[]'::jsonb)) x;
 s:=jsonb_set(s,'{solicitacoes}',tickets,true);
 if ticket->>'tipo'='agenda' and p_outcome='atendida' then
   select x into candidate from jsonb_array_elements(coalesce(s->'candidatos','[]'::jsonb)) x where x->>'id'=candidate_id limit 1;
   if candidate is null then raise exception 'candidate not found'; end if;
   if ticket ? 'agenda' then candidate:=jsonb_set(candidate,'{agenda}',ticket->'agenda',true); end if;
   if ticket ? 'observacoesAgenda' then candidate:=jsonb_set(candidate,'{observacoesAgenda}',ticket->'observacoesAgenda',true); end if;
   select coalesce(jsonb_agg(case when x->>'id'=candidate_id then candidate else x end),'[]'::jsonb) into candidates from jsonb_array_elements(coalesce(s->'candidatos','[]'::jsonb)) x;
   s:=jsonb_set(s,'{candidatos}',candidates,true);
 end if;
 update public.crm_state set state=s,updated_at=now() where singleton;
 return updated_ticket;
end $$;

-- Document metadata can only reference objects already uploaded beneath the candidate folder.
create or replace function public.update_candidate_documents(p_candidate_id text,p_documents jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare p public.profiles; c jsonb; old_docs jsonb; doc jsonb; base_doc jsonb; merged jsonb:='[]'::jsonb; file_path text; staff boolean;
begin
 p:=public.current_profile(); if p.id is null then raise exception 'not authorized' using errcode='42501'; end if;
 staff:=public.has_permission('candidatos');
 if p.role<>'admin' and not staff and (p.role<>'profissional' or p.candidate_id is distinct from p_candidate_id) then raise exception 'not authorized' using errcode='42501'; end if;
 if jsonb_typeof(p_documents)<>'array' then raise exception 'documents must be an array'; end if;
 select x into c from jsonb_array_elements((select state->'candidatos' from public.crm_state where singleton)) x where x->>'id'=p_candidate_id limit 1;
 if c is null then raise exception 'candidate not found'; end if;
 old_docs:=coalesce(c->'documentos','[]'::jsonb);
 if jsonb_array_length(p_documents)<>jsonb_array_length(old_docs) then raise exception 'document set cannot change'; end if;
 for doc in select value from jsonb_array_elements(p_documents) loop
   if jsonb_typeof(doc)<>'object' or not (doc ? 'nome') or not exists(select 1 from jsonb_array_elements(old_docs) o where o->>'nome'=doc->>'nome') or exists(select 1 from jsonb_array_elements(merged) m where m->>'nome'=doc->>'nome') then raise exception 'invalid or duplicate document'; end if;
   select o into base_doc from jsonb_array_elements(old_docs) o where o->>'nome'=doc->>'nome' limit 1;
   if doc ? 'arquivoId' and nullif(doc->>'arquivoId','') is not null then
     file_path:=doc->>'arquivoId';
     if split_part(file_path,'/',1)<>p_candidate_id or position('/' in file_path)=0 or not exists(select 1 from storage.objects o where o.bucket_id='professional-documents' and o.name=file_path) then raise exception 'invalid document object'; end if;
   end if;
   if not staff then
     if doc ?| array['status'] or (doc-'nome'-'arquivoId'-'arquivoNome'-'arquivoTipo'-'arquivoTamanho'-'enviadoEm')<>'{}'::jsonb then raise exception 'forbidden document fields' using errcode='42501'; end if;
     if coalesce(doc->>'arquivoId','')='' then raise exception 'file required'; end if;
   else
     if (doc-'nome'-'status'-'arquivoId'-'arquivoNome'-'arquivoTipo'-'arquivoTamanho'-'enviadoEm')<>'{}'::jsonb or coalesce(doc->>'status','pendente') not in ('pendente','enviado','validado') then raise exception 'invalid document review'; end if;
   end if;
   if staff then merged:=merged||jsonb_build_array(base_doc||doc); else merged:=merged||jsonb_build_array(base_doc||doc||jsonb_build_object('status','enviado')); end if;
 end loop;
 update public.crm_state set state=jsonb_set(state,'{candidatos}',(select jsonb_agg(case when x->>'id'=p_candidate_id then jsonb_set(x,'{documentos}',merged,true)||jsonb_build_object('atualizadoEm',now()) else x end) from jsonb_array_elements(state->'candidatos') x),true),updated_at=now() where singleton;
 return jsonb_build_object('ok',true);
end $$;

-- Trusted Edge Function operations only; service_role bypasses RLS.
create or replace function public.register_candidate_record(p_candidate jsonb,p_profile jsonb) returns text
language plpgsql security definer set search_path = '' as $$
declare cid text; begin
 if auth.role()<>'service_role' then raise exception 'service role required' using errcode='42501'; end if;
	 cid:=coalesce(p_candidate->>'id',gen_random_uuid()::text);
 update public.crm_state set state=jsonb_set(state,'{candidatos}',coalesce(state->'candidatos','[]'::jsonb)||jsonb_set(p_candidate,'{id}',to_jsonb(cid),true),true),updated_at=now() where singleton;
 insert into public.profiles(id,role,permissions,candidate_id,active,nome,email) values ((p_profile->>'id')::uuid,'profissional','{}'::jsonb,cid,true,coalesce(p_candidate->>'nome',''),coalesce(p_candidate->>'email',''));
 return cid;
end $$;
create or replace function public.import_legacy_state(p_state jsonb) returns void
language plpgsql security definer set search_path = '' as $$ begin
	if auth.role()<>'service_role' then raise exception 'service role required' using errcode='42501'; end if;
	if jsonb_typeof(p_state)<>'object' or jsonb_typeof(p_state->'candidatos')<>'array' then raise exception 'invalid state'; end if;
	perform 1 from public.crm_state where singleton for update;
	if not found then raise exception 'CRM state missing'; end if;
	if jsonb_typeof((select state->'candidatos' from public.crm_state where singleton)) is distinct from 'array'
	  or jsonb_array_length((select state->'candidatos' from public.crm_state where singleton))<>0 then
	  raise exception 'legacy import already completed';
	end if;
	update public.crm_state set state=p_state,updated_at=now() where singleton;
end $$;
revoke all on function public.get_public_state(),public.get_my_state(),public.save_my_state(jsonb),public.review_candidate_update(text,boolean),public.resolve_solicitation(text,text,text),public.update_candidate_documents(text,jsonb),public.register_candidate_record(jsonb,jsonb),public.import_legacy_state(jsonb) from public,anon;
grant execute on function public.get_public_state() to anon,authenticated;
grant execute on function public.get_my_state(),public.save_my_state(jsonb),public.review_candidate_update(text,boolean),public.resolve_solicitation(text,text,text),public.update_candidate_documents(text,jsonb) to authenticated;
grant execute on function public.register_candidate_record(jsonb,jsonb),public.import_legacy_state(jsonb) to service_role;

insert into storage.buckets(id,name,public) values ('professional-documents','professional-documents',false),('training-media','training-media',false) on conflict(id) do update set public=false;
drop policy if exists professional_documents_read on storage.objects;
create policy professional_documents_read on storage.objects for select to authenticated using (bucket_id='professional-documents' and (public.has_permission('candidatos') or ((public.current_profile()).role='profissional' and (storage.foldername(name))[1]=(public.current_profile()).candidate_id)));
drop policy if exists professional_documents_insert on storage.objects;
create policy professional_documents_insert on storage.objects for insert to authenticated with check (bucket_id='professional-documents' and (((public.current_profile()).role='profissional' and (storage.foldername(name))[1]=(public.current_profile()).candidate_id) or public.has_permission('candidatos')));
drop policy if exists professional_documents_update on storage.objects;
create policy professional_documents_update on storage.objects for update to authenticated using (bucket_id='professional-documents' and public.has_permission('candidatos')) with check (bucket_id='professional-documents' and public.has_permission('candidatos'));
drop policy if exists professional_documents_delete on storage.objects;
create policy professional_documents_delete on storage.objects for delete to authenticated using (bucket_id='professional-documents' and public.has_permission('candidatos'));
drop policy if exists training_media_read on storage.objects;
create policy training_media_read on storage.objects for select to authenticated using (bucket_id='training-media' and (public.has_permission('treinamentos') or coalesce((metadata->>'published')::boolean,false)));
drop policy if exists training_media_insert on storage.objects;
create policy training_media_insert on storage.objects for insert to authenticated with check (bucket_id='training-media' and public.has_permission('treinamentos'));
drop policy if exists training_media_update on storage.objects;
create policy training_media_update on storage.objects for update to authenticated using (bucket_id='training-media' and public.has_permission('treinamentos')) with check (bucket_id='training-media' and public.has_permission('treinamentos'));
drop policy if exists training_media_delete on storage.objects;
create policy training_media_delete on storage.objects for delete to authenticated using (bucket_id='training-media' and public.has_permission('treinamentos'));
commit;
