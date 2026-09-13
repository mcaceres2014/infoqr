-- Ejecutar en el SQL editor de tu proyecto Supabase

create extension if not exists "pgcrypto";

create table if not exists capsules (
  id uuid primary key default gen_random_uuid(),
  mode text default 'media',              -- 'media' (fotos/video) o 'ai' (presentación generada por IA)
  message text,
  sender_name text,
  color text default '#D85A30',
  frame_text text default 'escaneame',
  icon text default 'heart',
  media jsonb default '[]'::jsonb,
  description text,                        -- descripción original que el usuario dictó/escribió
  content_type text,                        -- 'producto' | 'persona' | 'equipo' | 'lugar' (opcional, ayuda a la IA)
  presentation jsonb,                       -- { title, subtitle, sections: [...], highlights: [...] } generado por la IA
  music_url text,                           -- link o archivo subido de música de fondo
  single_use boolean default false,
  viewed boolean default false,
  created_at timestamp with time zone default now()
);

-- Si ya habías corrido este script antes (proyecto existente), esto agrega
-- las columnas nuevas sin borrar tus datos. Si es un proyecto nuevo, no pasa nada.
alter table capsules add column if not exists mode text default 'media';
alter table capsules add column if not exists description text;
alter table capsules add column if not exists content_type text;
alter table capsules add column if not exists presentation jsonb;
alter table capsules add column if not exists music_url text;
alter table capsules add column if not exists single_use boolean default false;
alter table capsules add column if not exists viewed boolean default false;

-- Habilitar Row Level Security
alter table capsules enable row level security;

-- Cualquiera puede crear una cápsula (usuarios registrados; se paga antes
-- de que el contenido quede visible)
drop policy if exists "cualquiera puede crear capsulas" on capsules;
create policy "cualquiera puede crear capsulas"
on capsules for insert
to anon, authenticated
with check (true);

-- Cualquiera con el id (link del QR) puede leer la cápsula
drop policy if exists "cualquiera puede leer capsulas por id" on capsules;
create policy "cualquiera puede leer capsulas por id"
on capsules for select
to anon, authenticated
using (true);

-- Necesario para el modo "un solo uso": marcar la cápsula como vista.
-- Nota de seguridad MVP: esta política permite actualizar cualquier campo.
-- Para producción real, conviene restringirla solo a la columna "viewed"
-- usando una función de base de datos (RPC) en vez de update directo.
drop policy if exists "marcar capsula como vista" on capsules;
create policy "marcar capsula como vista"
on capsules for update
to anon, authenticated
using (true)
with check (true);

-- Bucket de almacenamiento para fotos y videos
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists "lectura publica de media" on storage.objects;
create policy "lectura publica de media"
on storage.objects for select
to anon
using (bucket_id = 'media');

drop policy if exists "subida publica de media" on storage.objects;
create policy "subida publica de media"
on storage.objects for insert
to anon
with check (bucket_id = 'media');

-- ============================================================
-- USUARIOS Y PAGOS POR CÓDIGO (MercadoPago) — modelo pago por uso
-- ============================================================

-- Perfil simple de cada usuario registrado (solo para historial de
-- compras y contacto, ya no hay planes ni suscripciones).
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

drop policy if exists "usuario ve su propio perfil" on profiles;
create policy "usuario ve su propio perfil"
on profiles for select to authenticated
using (auth.uid() = id);

drop policy if exists "usuario crea su propio perfil" on profiles;
create policy "usuario crea su propio perfil"
on profiles for insert to authenticated
with check (auth.uid() = id);

-- Cuando alguien se registra (auth.users), se le crea automáticamente
-- su perfil.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Cada cápsula se paga individualmente según su nivel de contenido
-- (texto / fotos-planos / video) y su MODO DE ACCESO, que puede ser de
-- dos tipos (uno u otro, nunca ambos a la vez):
--   - 'duration': visitas ilimitadas mientras dure el tiempo contratado
--   - 'views':    sin límite de tiempo, se agota al alcanzar los usos pagados
-- El precio se calcula siempre en el servidor a partir de lib/pricing.js,
-- nunca se confía en un monto enviado desde el navegador.
alter table capsules add column if not exists user_id uuid references auth.users(id);
alter table capsules add column if not exists content_level text default 'text'; -- 'text' | 'images' | 'video'
alter table capsules add column if not exists slideshow boolean default false; -- fotos en modo diapositiva animada con música
alter table capsules add column if not exists access_type text default 'duration'; -- 'duration' | 'views'
alter table capsules add column if not exists duration_tier text;   -- '24h' | '7d' | '30d' | 'forever' (si access_type='duration')
alter table capsules add column if not exists views_tier int;        -- 50 | 100 | 500 | 1000 (si access_type='views')
alter table capsules add column if not exists views_used int default 0;
alter table capsules add column if not exists price int;
alter table capsules add column if not exists payment_status text default 'pending_payment'; -- 'pending_payment' | 'paid'
alter table capsules add column if not exists expires_at timestamptz; -- solo aplica en modo 'duration'
alter table capsules add column if not exists disabled_by_owner boolean default false; -- apagado manual del dueño

drop policy if exists "usuario ve sus propias capsulas para gestion" on capsules;
create policy "usuario ve sus propias capsulas para gestion"
on capsules for select to authenticated
using (auth.uid() = user_id);

-- El dueño puede apagar manualmente su propio QR en cualquier momento
-- (ej. "ya vendí la propiedad"), o cambiar de modo de acceso al recargar.
drop policy if exists "usuario actualiza sus propias capsulas" on capsules;
create policy "usuario actualiza sus propias capsulas"
on capsules for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Registro de cada cobro: tanto la creación inicial de una cápsula como
-- cada recarga o cambio de modo de acceso posterior generan una fila acá.
-- Útil para el historial de compras y para conciliar con Flow.
create table if not exists purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  capsule_id uuid references capsules(id),
  kind text default 'creation', -- 'creation' | 'recharge'
  content_level text,
  access_type text,
  access_tier text, -- ej. '7d' o '500', según corresponda
  flow_token text,
  flow_order text,
  status text default 'pending', -- 'pending' | 'approved' | 'rejected'
  amount int,
  created_at timestamptz default now()
);

alter table purchases enable row level security;

drop policy if exists "usuario ve sus propias compras" on purchases;
create policy "usuario ve sus propias compras"
on purchases for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "cualquiera puede crear registros de compra" on purchases;
create policy "cualquiera puede crear registros de compra"
on purchases for insert to anon, authenticated
with check (true);

-- ============================================================
-- MODERACIÓN Y REPORTES DE CONTENIDO
-- ============================================================

-- Cualquiera que vea un QR puede reportarlo si le parece indebido.
-- Si una cápsula acumula varios reportes, se desactiva automáticamente
-- (misma columna "disabled_by_owner" que usa el apagado manual, para no
-- duplicar la lógica de bloqueo en el visor).
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  capsule_id uuid references capsules(id),
  reason text,
  created_at timestamptz default now()
);

alter table reports enable row level security;

drop policy if exists "cualquiera puede reportar una capsula" on reports;
create policy "cualquiera puede reportar una capsula"
on reports for insert
to anon, authenticated
with check (true);

-- Umbral de reportes antes de auto-desactivar (editable acá mismo).
-- 3 reportes independientes desactivan la cápsula automáticamente,
-- como medida de seguridad mientras no exista un panel de moderación.
