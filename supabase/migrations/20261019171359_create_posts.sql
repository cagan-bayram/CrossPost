-- One row per piece of content the user wants to crosspost
create table public.posts (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
    video_path text not null,
    title text not null default '',
    description text not null default '',
    tags text[] not null default '{}',
    created_at timestamptz not null default now()
);

-- One row per platform the post should go to
create table public.post_targets (
    id uuid primary key default gen_random_uuid(),
    post_id uuid not null references public.posts (id) on delete cascade,
    platform text not null check (platform in ('tiktok', 'instagram', 'youtube')),
    title text,
    description text,
    tags text[],
    status text not null default 'pending'
        check (status in ('pending', 'posting', 'posted', 'failed')),
    error text,
    external_url text,
    posted_at timestamptz,
    created_at timestamptz not null default now(),
    unique (post_id, platform)
);

create index posts_user_id_idx on public.posts (user_id);
create index post_targets_post_id_idx on public.post_targets (post_id);

alter table public.posts enable row level security;
alter table public.post_targets enable row level security;

-- posts: users manage only their own, and only with videos from their own folder
create policy "Users can view their own posts"
on public.posts for select to authenticated
using (user_id = (select auth.uid()));

create policy "Users can create their own posts"
on public.posts for insert to authenticated
with check (
    user_id = (select auth.uid())
    and split_part(video_path, '/', 1) = (select auth.uid())::text
);

create policy "Users can delete their own posts"
on public.posts for delete to authenticated
using (user_id = (select auth.uid()));

-- post_targets: access goes through the parent post's owner
create policy "Users can view targets of their own posts"
on public.post_targets for select to authenticated
using (
    exists (
        select 1 from public.posts
        where posts.id = post_targets.post_id
            and posts.user_id = (select auth.uid())
    )
);

create policy "Users can create pending targets for their own posts"
on public.post_targets for insert to authenticated
with check (
    status = 'pending'
    and error is null
    and external_url is null
    and posted_at is null
    and exists (
        select 1 from public.posts
        where posts.id = post_targets.post_id
            and posts.user_id = (select auth.uid())
    )
);