-- Profile, subscriptions, and notifications

create table if not exists public.notification_settings (
  user_id uuid primary key references public.users (id) on delete cascade,
  new_follower boolean not null default true,
  dapaint_invite boolean not null default true,
  dapaint_joined boolean not null default true,
  dapaint_starting boolean not null default true,
  dapaint_result boolean not null default true,
  messages boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_subscriptions (
  subscriber_id uuid not null references public.users (id) on delete cascade,
  subscribed_to_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (subscriber_id, subscribed_to_id),
  constraint user_subscriptions_no_self check (subscriber_id <> subscribed_to_id)
);

create index if not exists user_subscriptions_subscribed_to_id_idx
  on public.user_subscriptions (subscribed_to_id);
create index if not exists user_subscriptions_subscriber_id_idx
  on public.user_subscriptions (subscriber_id);

create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.notification_settings enable row level security;
alter table public.user_subscriptions enable row level security;
alter table public.support_requests enable row level security;
alter table public.feedback enable row level security;
alter table public.privacy_requests enable row level security;

create policy "Users can manage their own notification settings"
  on public.notification_settings
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can view their subscriptions"
  on public.user_subscriptions
  for select
  using (auth.uid() = subscriber_id or auth.uid() = subscribed_to_id);

create policy "Public can read subscriptions"
  on public.user_subscriptions
  for select
  using (true);

create policy "Users can create subscriptions"
  on public.user_subscriptions
  for insert
  with check (auth.uid() = subscriber_id);

create policy "Users can delete their subscriptions"
  on public.user_subscriptions
  for delete
  using (auth.uid() = subscriber_id);

create policy "Users can submit support requests"
  on public.support_requests
  for insert
  with check (auth.uid() = user_id);

create policy "Users can view their support requests"
  on public.support_requests
  for select
  using (auth.uid() = user_id);

create policy "Users can submit feedback"
  on public.feedback
  for insert
  with check (auth.uid() = user_id);

create policy "Users can view their feedback"
  on public.feedback
  for select
  using (auth.uid() = user_id);

create policy "Users can submit privacy requests"
  on public.privacy_requests
  for insert
  with check (auth.uid() = user_id);

create policy "Users can view their privacy requests"
  on public.privacy_requests
  for select
  using (auth.uid() = user_id);

create or replace function public.delete_user()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  delete from public.user_subscriptions
    where subscriber_id = auth.uid() or subscribed_to_id = auth.uid();
  delete from public.notification_settings where user_id = auth.uid();
  delete from public.support_requests where user_id = auth.uid();
  delete from public.feedback where user_id = auth.uid();
  delete from public.privacy_requests where user_id = auth.uid();
  delete from public.users where id = auth.uid();
  delete from auth.users where id = auth.uid();
end;
$$;

grant execute on function public.delete_user() to authenticated;

create or replace function public.delete_inactive_users()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  inactive_ids uuid[];
begin
  select array_agg(id)
    into inactive_ids
    from public.users
    where last_active_at < now() - interval '10 years';

  if inactive_ids is null then
    return;
  end if;

  delete from public.user_subscriptions
    where subscriber_id = any(inactive_ids)
    or subscribed_to_id = any(inactive_ids);
  delete from public.notification_settings
    where user_id = any(inactive_ids);
  delete from public.support_requests
    where user_id = any(inactive_ids);
  delete from public.feedback
    where user_id = any(inactive_ids);
  delete from public.privacy_requests
    where user_id = any(inactive_ids);
  delete from public.users
    where id = any(inactive_ids);
  delete from auth.users
    where id = any(inactive_ids);
end;
$$;
