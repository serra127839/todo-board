select 'projects' as table, count(*) as rows from public.projects
union all
select 'project_state' as table, count(*) as rows from public.project_state
union all
select 'snapshots' as table, count(*) as rows from public.snapshots;

select 'projects' as table, relrowsecurity as rls_enabled from pg_class where relname = 'projects'
union all
select 'project_state' as table, relrowsecurity as rls_enabled from pg_class where relname = 'project_state'
union all
select 'snapshots' as table, relrowsecurity as rls_enabled from pg_class where relname = 'snapshots';

