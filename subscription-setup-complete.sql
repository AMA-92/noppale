-- SYSTÈME COMPLET D'ABONNEMENT - ÉTAPE 1 à 5
-- Copiez-collez ce script dans votre dashboard Supabase > Éditeur SQL

-- ÉTAPE 1: Créer la table profiles
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  account_status text default 'active',
  subscription_end timestamptz,
  grace_period_end timestamptz,
  is_admin boolean default false,
  subscription_note text,
  created_at timestamptz default now()
);

-- ÉTAPE 2: Créer la fonction handle_new_user
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (
    id,
    full_name,
    account_status,
    subscription_end,
    grace_period_end
  )
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    'active',
    now() + interval '30 days',
    now() + interval '35 days'
  );

  return new;
end;
$$ language plpgsql security definer;

-- ÉTAPE 3: Créer le trigger automatique
create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user();

-- ÉTAPE 4: Activer RLS
alter table public.profiles enable row level security;

-- ÉTAPE 5: Créer les policies
-- Permettre à l'utilisateur de lire son profil
create policy "Users can view own profile"
on public.profiles
for select
using (auth.uid() = id);

-- Permettre à l'utilisateur de modifier seulement son nom
create policy "Users can update own profile"
on public.profiles
for update
using (auth.uid() = id)
with check (
  auth.uid() = id and 
  full_name is not null and
  account_status = 'active' and
  subscription_end is not null and
  grace_period_end is not null and
  is_admin = false
);

-- ÉTAPE 6: Fonction de vérification avancée (BONUS PRO)
create or replace function public.is_user_allowed(user_id uuid)
returns boolean as $$
declare
  user_profile record;
begin
  select * into user_profile from profiles where id = user_id;
  
  if user_profile.is_admin = true then
    return true;
  end if;
  
  if user_profile.account_status = 'paused' then
    return false;
  end if;
  
  if now() <= user_profile.grace_period_end then
    return true;
  end if;
  
  return false;
end;
$$ language plpgsql security definer;

-- ÉTAPE 7: Vue admin pour les utilisateurs actifs
create view public.active_users as
select 
  id,
  full_name,
  account_status,
  subscription_end,
  grace_period_end,
  is_admin,
  subscription_note,
  created_at
from profiles
where account_status = 'active';

-- ÉTAPE 8: Créer votre profil admin (remplacez avec votre UUID)
-- Pour votre utilisateur: b4924395-61b5-461e-bc4d-d50e4c8f2bb7
insert into public.profiles (
  id,
  full_name,
  account_status,
  subscription_end,
  grace_period_end,
  is_admin,
  subscription_note
)
values (
  'b4924395-61b5-461e-bc4d-d50e4c8f2bb7',
  'Administrateur',
  'active',
  now() + interval '365 days',
  now() + interval '370 days',
  true,
  'Compte administrateur'
)
on conflict (id) do update set
  is_admin = true,
  subscription_end = greatest(profiles.subscription_end, now() + interval '365 days'),
  grace_period_end = greatest(profiles.grace_period_end, now() + interval '370 days');

-- ÉTAPE 9: Vérification
select 'profiles' as table_name, count(*) as count from profiles
union all
select 'active_users' as view_name, count(*) as count from active_users;
