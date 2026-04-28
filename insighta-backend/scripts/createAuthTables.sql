create table if not exists public.users (
  id uuid primary key,
  github_id varchar unique not null,
  username varchar not null,
  email varchar,
  avatar_url varchar,
  role varchar not null default 'analyst' check (role in ('admin', 'analyst')),
  is_active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id uuid primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  refresh_token varchar unique not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);

create index if not exists idx_sessions_user on public.sessions(user_id);
create index if not exists idx_sessions_refresh on public.sessions(refresh_token);
create index if not exists idx_sessions_expires on public.sessions(expires_at);
