-- Execute uma vez no SQL Editor do seu projeto Supabase.
-- Somente estrutura e permissões: não contém senha nem lançamentos financeiros.
begin;
create schema if not exists ourhome_private;
revoke all on schema ourhome_private from public, anon, authenticated;

create table if not exists ourhome_private.members (
 person text primary key check(person in ('rhian','amanda')),
 email text unique not null,
 user_id uuid unique references auth.users(id)
);
insert into ourhome_private.members(person,email) values
 ('rhian','rhianfigueiredo@gmail.com'),('amanda','uchoaamanda42@gmail.com')
on conflict(person) do nothing;
create table if not exists ourhome_private.entries (
 id text primary key, owner text not null, scope text not null, type text not null,
 payer text not null check(payer in ('rhian','amanda')), amount bigint not null check(amount between 1 and 100000000000),
 category text not null, description text not null default '', date date not null,
 status text not null check(status in ('paid','planned')), series text,
 created_by text not null, version integer not null default 1, deleted boolean not null default false,
 updated_at timestamptz not null default now(),
 check((scope='personal' and owner in ('rhian','amanda') and payer=owner and type in ('expense','income'))
    or (scope='house' and owner='house' and type in ('expense','settlement'))),
 check(type<>'settlement' or (status='paid' and category='Acerto'))
);
create index if not exists entries_scope_date on ourhome_private.entries(scope,owner,date);
create table if not exists ourhome_private.goals (
 id text primary key, owner text not null check(owner in ('house','rhian','amanda')),
 name text not null, target bigint not null check(target between 1 and 100000000000), deadline date not null,
 version integer not null default 1, deleted boolean not null default false
);
create table if not exists ourhome_private.contributions (
 id text primary key, goal_id text not null references ourhome_private.goals(id),
 owner text not null check(owner in ('rhian','amanda')), amount bigint not null check(amount between 1 and 100000000000), date date not null
);
create table if not exists ourhome_private.budgets (
 owner text not null check(owner in ('house','rhian','amanda')), month text not null,
 category text not null, amount bigint not null check(amount between 0 and 100000000000), primary key(owner,month,category)
);
create table if not exists ourhome_private.reviews (week date not null, member text not null, primary key(week,member));
create table if not exists ourhome_private.preferences (member text primary key, share_income boolean not null default false);
create table if not exists ourhome_private.audit (
 id uuid primary key default gen_random_uuid(), actor text not null, entity text not null,
 entity_id text not null, action text not null, at timestamptz not null default now()
);

-- Identidade validada pelo Supabase; nunca aceita a pessoa enviada pelo navegador.
-- O vínculo com o UUID da primeira conta confirmada é permanente.
create or replace function ourhome_private.person() returns text
language plpgsql security definer set search_path='' as $$
declare member_row ourhome_private.members%rowtype; confirmed_email text;
begin
 if auth.uid() is null then raise exception 'Entre na sua conta.' using errcode='28000'; end if;
 select lower(email) into confirmed_email from auth.users
 where id=auth.uid() and email_confirmed_at is not null;
 select * into member_row from ourhome_private.members where email=confirmed_email for update;
 if not found then raise exception 'Esta conta não tem acesso ao Lar em dia.' using errcode='42501'; end if;
 if member_row.user_id is null then
  update ourhome_private.members set user_id=auth.uid() where person=member_row.person;
 elsif member_row.user_id<>auth.uid() then
  raise exception 'Esta pessoa já está vinculada a outra conta.' using errcode='42501';
 end if;
 return member_row.person;
end $$;

create or replace function ourhome_private.valid_amount(v jsonb, allow_zero boolean default false) returns bigint
language plpgsql set search_path='' as $$
declare n numeric;
begin
 if jsonb_typeof(v)<>'number' or v is null then raise exception 'Confira o valor em centavos.'; end if;
 n:=(v#>>'{}')::numeric;
 if n<>trunc(n) or n<(case when allow_zero then 0 else 1 end) or n>100000000000 then raise exception 'Valor fora do limite.'; end if;
 return n::bigint;
end $$;
create or replace function ourhome_private.valid_id(v text) returns text
language plpgsql set search_path='' as $$ begin
 if v is null or v !~ '^[a-zA-Z0-9_-]{8,90}$' then raise exception 'Identificador inválido.'; end if; return v;
end $$;
create or replace function ourhome_private.valid_date(v text) returns date
language plpgsql set search_path='' as $$
declare d date;
begin
 if v is null or v !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Confira a data.'; end if;
 d:=v::date;
 if d<'2000-01-01'::date or d>'2100-12-31'::date then raise exception 'Confira a data.'; end if; return d;
end $$;
create or replace function ourhome_private.log(p text, entity text, id text, action text) returns void
language sql set search_path='' as $$
 insert into ourhome_private.audit(actor,entity,entity_id,action) values(p,entity,id,action);
$$;

create or replace function public.lar_state() returns jsonb
language plpgsql security definer set search_path='' as $$
declare p text:=ourhome_private.person(); result jsonb; both_share boolean;
begin
 select count(*)=2 and bool_and(share_income) into both_share from ourhome_private.preferences where member in ('rhian','amanda');
 select jsonb_build_object(
  'person',p,
  'entries',coalesce((select jsonb_agg(to_jsonb(e) order by e.date desc,e.id) from ourhome_private.entries e where not deleted and (scope='house' or owner=p)),'[]'::jsonb),
  'trash',coalesce((select jsonb_agg(to_jsonb(e) order by e.date desc,e.id) from ourhome_private.entries e where deleted and (scope='house' or owner=p)),'[]'::jsonb),
  'goals',coalesce((select jsonb_agg(to_jsonb(g)) from ourhome_private.goals g where not deleted and (owner='house' or owner=p)),'[]'::jsonb),
  'contributions',coalesce((select jsonb_agg(to_jsonb(c)) from ourhome_private.contributions c join ourhome_private.goals g on g.id=c.goal_id where not g.deleted and (g.owner='house' or g.owner=p)),'[]'::jsonb),
  'budgets',coalesce((select jsonb_agg(to_jsonb(b)) from ourhome_private.budgets b where owner='house' or owner=p),'[]'::jsonb),
  'reviews',coalesce((select jsonb_agg(to_jsonb(r)) from (select * from ourhome_private.reviews order by week desc limit 104) r),'[]'::jsonb),
  'shareIncome',coalesce((select share_income from ourhome_private.preferences where member=p),false),
  'combinedIncome',case when both_share then coalesce((select jsonb_agg(to_jsonb(x)) from (select to_char(date,'YYYY-MM') AS month,sum(amount) AS amount from ourhome_private.entries where type='income' and status='paid' and not deleted group by 1) x),'[]'::jsonb) else null end,
  'today',(now() at time zone 'America/Sao_Paulo')::date
 ) into result;
 return result;
end $$;

create or replace function public.lar_mutate(p_path text,payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 p text:=ourhome_private.person(); b jsonb:=payload; action text:=payload->>'action';
 v_id text; v_owner text; v_scope text; v_type text; v_payer text; v_category text; v_desc text;
 v_amount bigint; v_date date; v_status text; v_repeat text; v_count integer; v_version integer;
 original_amount bigint; original_date date; original_status text; original_desc text;
 row_entry ourhome_private.entries%rowtype; row_goal ourhome_private.goals%rowtype;
 v_series text; root_id text; i integer; found_count integer; expected_ids text[];
 today date:=(now() at time zone 'America/Sao_Paulo')::date;
begin
 if b is null or jsonb_typeof(b)<>'object' or octet_length(b::text)>40000 then raise exception 'Formato inválido.'; end if;
 if p_path='/api/entries' then
  v_id:=ourhome_private.valid_id(b->>'id');
  if action='create' then
   v_type:=b->>'type';
   if v_type is null or v_type not in ('income','expense','settlement') then raise exception 'Tipo inválido.'; end if;
   v_scope:=case v_type when 'income' then 'personal' when 'settlement' then 'house' else b->>'scope' end;
   if v_scope is null or v_scope not in ('personal','house') then raise exception 'Escolha Casa ou Pessoal.'; end if;
   v_owner:=case when v_scope='personal' then p else 'house' end;
   v_payer:=case when v_scope='personal' then p else b->>'payer' end;
   v_repeat:=case when v_type='settlement' then 'none' else coalesce(b->>'repeat','none') end;
   if v_repeat not in ('none','monthly','installments') then raise exception 'Confira a repetição.'; end if;
   v_count:=case when v_repeat='none' then 1 else (b->>'count')::integer end;
   if v_count is null or v_count<1 or v_count>36 then raise exception 'Use até 36 meses.'; end if;
  else
   if action is null or action not in ('update','delete','restore') then raise exception 'Ação inválida.'; end if;
   select * into row_entry from ourhome_private.entries where id=v_id for update;
   if not found or (row_entry.scope<>'house' and row_entry.owner<>p) then raise exception 'Registro indisponível.' using errcode='42501'; end if;
   if jsonb_typeof(b->'version')<>'number' or b->>'version' is null or (b->>'version')::numeric<>row_entry.version then raise exception 'Este registro mudou. Atualize antes de editar.' using errcode='40001'; end if;
   if action in ('delete','restore') then
    update ourhome_private.entries set deleted=(action='delete'),version=version+1,updated_at=now() where id=v_id;
    perform ourhome_private.log(p,'entry',v_id,action);
    return public.lar_state();
   end if;
   if row_entry.deleted then raise exception 'Registro excluído. Atualize a lista.'; end if;
   v_type:=row_entry.type; v_scope:=row_entry.scope; v_owner:=row_entry.owner;
   v_payer:=case when v_scope='personal' then p else b->>'payer' end;
  end if;
  if v_payer is null or v_payer not in ('rhian','amanda') then raise exception 'Escolha quem pagou.'; end if;
  v_category:=case when v_type='settlement' then 'Acerto' else btrim(b->>'category') end;
  if v_category is null or (v_type='income' and v_category not in ('Salário','Freelance','Extra','Outros')) or (v_type='expense' and v_category not in ('Mercado','Moradia','Delivery','Transporte','Saúde','Lazer','Educação','Assinaturas','Outros')) then raise exception 'Escolha uma categoria.'; end if;
  v_amount:=ourhome_private.valid_amount(b->'amount'); v_date:=ourhome_private.valid_date(b->>'date');
  v_status:=case when v_type='settlement' then 'paid' else b->>'status' end;
  if v_status is null or v_status not in ('paid','planned') then raise exception 'Situação inválida.'; end if;
  if v_status='paid' and v_date>today then raise exception 'Use Previsto para uma data futura.'; end if;
  v_desc:=left(btrim(coalesce(b->>'description','')),120);
  if action='update' then
   update ourhome_private.entries set amount=v_amount,date=v_date,status=v_status,category=v_category,description=v_desc,payer=v_payer,version=version+1,updated_at=now() where id=v_id;
  else
   if v_repeat='installments' and v_amount<v_count then raise exception 'O total precisa ter ao menos um centavo por parcela.'; end if;
   root_id:=v_id; original_amount:=v_amount; original_date:=v_date; original_status:=v_status; original_desc:=v_desc;
   select array_agg(case when v_count=1 then root_id else root_id||'_'||g::text end) into expected_ids from generate_series(1,v_count) g;
   if exists(select 1 from ourhome_private.entries where id=any(expected_ids) and scope<>'house' and owner<>p) then raise exception 'Registro indisponível.' using errcode='42501'; end if;
   select count(*) into found_count from ourhome_private.entries where id=any(expected_ids);
   if found_count=v_count then return public.lar_state(); end if;
   if found_count<>0 then raise exception 'Parte desta série já existe. Atualize.' using errcode='40001'; end if;
   -- A chamada inteira é uma transação; uma falha reverte todas as parcelas.
   for i in 0..v_count-1 loop
    v_id:=expected_ids[i+1]; v_date:=(original_date+make_interval(months=>i))::date;
    if v_date>'2100-12-31'::date then raise exception 'A repetição ultrapassa o limite de datas.'; end if;
    v_amount:=case when v_repeat='installments' then original_amount/v_count + case when i<original_amount%v_count then 1 else 0 end else original_amount end;
    v_status:=case when i=0 then original_status else 'planned' end;
    v_desc:=case when v_count>1 then coalesce(nullif(original_desc,''),v_category)||' · '||(i+1)::text||'/'||v_count::text else original_desc end;
    insert into ourhome_private.entries(id,owner,scope,type,payer,amount,category,description,date,status,series,created_by)
     values(v_id,v_owner,v_scope,v_type,v_payer,v_amount,v_category,v_desc,v_date,v_status,case when v_count>1 then root_id else null end,p);
   end loop;
   v_id:=root_id;
  end if;
  perform ourhome_private.log(p,'entry',v_id,action);
 elsif p_path='/api/goals' then
  v_id:=ourhome_private.valid_id(b->>'id');
  select * into row_goal from ourhome_private.goals where id=v_id for update;
  if action='create' then
   if found then
    if row_goal.owner not in ('house',p) then raise exception 'Meta indisponível.' using errcode='42501'; end if;
   else
    v_owner:=case when b->>'owner'='house' then 'house' else p end;
    v_desc:=left(btrim(coalesce(b->>'name','')),70);
    if v_desc='' then raise exception 'Dê um nome ao plano.'; end if;
    insert into ourhome_private.goals(id,owner,name,target,deadline) values(v_id,v_owner,v_desc,ourhome_private.valid_amount(b->'target'),ourhome_private.valid_date(b->>'deadline'));
    perform ourhome_private.log(p,'goal',v_id,action);
   end if;
  elsif action='contribute' then
   if not found or row_goal.deleted or row_goal.owner not in ('house',p) then raise exception 'Meta indisponível.' using errcode='42501'; end if;
   root_id:=ourhome_private.valid_id(b->>'contributionId');
   if exists(select 1 from ourhome_private.contributions where id=root_id and (owner<>p or goal_id<>v_id)) then raise exception 'Reserva indisponível.' using errcode='42501'; end if;
   insert into ourhome_private.contributions(id,goal_id,owner,amount,date) values(root_id,v_id,p,ourhome_private.valid_amount(b->'amount'),ourhome_private.valid_date(b->>'date')) on conflict(id) do nothing;
   perform ourhome_private.log(p,'goal',v_id,action);
  else raise exception 'Ação inválida.'; end if;
 elsif p_path='/api/budget' then
  v_owner:=case when b->>'owner'='house' then 'house' else p end;
  v_desc:=b->>'month'; v_category:=b->>'category';
  if v_desc is null or v_desc !~ '^20\d{2}-(0[1-9]|1[0-2])$' then raise exception 'Mês inválido.'; end if;
  if v_category is null or v_category not in ('Total','Mercado','Moradia','Delivery','Transporte','Saúde','Lazer','Educação','Assinaturas','Outros') then raise exception 'Categoria inválida.'; end if;
  insert into ourhome_private.budgets(owner,month,category,amount) values(v_owner,v_desc,v_category,ourhome_private.valid_amount(b->'amount',true)) on conflict(owner,month,category) do update set amount=excluded.amount;
 elsif p_path='/api/review' then
  v_date:=ourhome_private.valid_date(b->>'week');
  if extract(isodow from v_date)<>1 or v_date>today then raise exception 'Semana inválida.'; end if;
  insert into ourhome_private.reviews(week,member) values(v_date,p) on conflict do nothing;
 elsif p_path='/api/preferences' then
  if jsonb_typeof(b->'shareIncome') is distinct from 'boolean' then raise exception 'Escolha inválida.'; end if;
  insert into ourhome_private.preferences(member,share_income) values(p,(b->>'shareIncome')::boolean) on conflict(member) do update set share_income=excluded.share_income;
 else raise exception 'Operação indisponível.'; end if;
 return public.lar_state();
end $$;

-- Sem acesso direto às tabelas ou funções internas, inclusive com a chave pública.
alter table ourhome_private.members enable row level security;
alter table ourhome_private.entries enable row level security;
alter table ourhome_private.goals enable row level security;
alter table ourhome_private.contributions enable row level security;
alter table ourhome_private.budgets enable row level security;
alter table ourhome_private.reviews enable row level security;
alter table ourhome_private.preferences enable row level security;
alter table ourhome_private.audit enable row level security;
revoke all on all tables in schema ourhome_private from public,anon,authenticated;
revoke all on all functions in schema ourhome_private from public,anon,authenticated;
revoke all on function public.lar_state() from public,anon;
revoke all on function public.lar_mutate(text,jsonb) from public,anon;
grant execute on function public.lar_state() to authenticated;
grant execute on function public.lar_mutate(text,jsonb) to authenticated;
notify pgrst, 'reload schema';
commit;
