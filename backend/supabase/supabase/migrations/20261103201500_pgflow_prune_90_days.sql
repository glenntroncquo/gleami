-- pgflow does not ship prune_data_older_than in its migrations.
-- This is the 0.17 function from the pgflow prune docs: finished runs older
-- than the retention window, their tasks, and the archived queue messages.
-- Started runs are left alone. Flow and step definitions are left alone.

create or replace function pgflow.prune_data_older_than(
  retention_interval interval
) returns void
language plpgsql
set search_path = pgflow, pgmq, pg_temp
as $$
declare
  cutoff_timestamp timestamptz := now() - retention_interval;
  task_record record;
  route_record record;
  archive_table text;
  dynamic_sql text;
begin
  delete from pgflow.workers
  where last_heartbeat_at < cutoff_timestamp;

  for task_record in
    select
      st.queue_name,
      array_agg(st.message_id) filter (where st.message_id is not null) as message_ids
    from pgflow.runs r
    join pgflow.step_tasks st on st.run_id = r.run_id
    where (
      (r.completed_at is not null and r.completed_at < cutoff_timestamp) or
      (r.failed_at is not null and r.failed_at < cutoff_timestamp)
    )
    group by st.queue_name
  loop
    if task_record.message_ids is not null and array_length(task_record.message_ids, 1) > 0 then
      perform pgmq.delete(
        task_record.queue_name,
        task_record.message_ids
      );
    end if;
  end loop;

  delete from pgflow.step_tasks
  where run_id in (
    select run_id from pgflow.runs
    where (
      (completed_at is not null and completed_at < cutoff_timestamp) or
      (failed_at is not null and failed_at < cutoff_timestamp)
    )
  );

  delete from pgflow.step_states
  where run_id in (
    select run_id from pgflow.runs
    where (
      (completed_at is not null and completed_at < cutoff_timestamp) or
      (failed_at is not null and failed_at < cutoff_timestamp)
    )
  );

  delete from pgflow.runs
  where (
    (completed_at is not null and completed_at < cutoff_timestamp) or
    (failed_at is not null and failed_at < cutoff_timestamp)
  );

  for route_record in
    select distinct queue_name from (
      select queue_name from pgflow.steps
      union
      select lower(flow_slug) from pgflow.flows where queue_mode = 'flow'
    ) routes
  loop
    archive_table := pgmq.format_table_name(
      route_record.queue_name,
      'a'
    );

    if exists (
      select 1 from information_schema.tables
      where table_schema = 'pgmq' and table_name = archive_table
    ) then
      dynamic_sql := format('
        delete from pgmq.%I
        where archived_at < $1
      ', archive_table);

      execute dynamic_sql using cutoff_timestamp;
    end if;
  end loop;
end
$$;

revoke all on function pgflow.prune_data_older_than(interval) from public, anon, authenticated;

do $$
begin
  perform cron.unschedule('pgflow-prune-weekly');
exception
  when others then
    null;
end
$$;

select cron.schedule(
  'pgflow-prune-weekly',
  '0 2 * * 0',
  $$select pgflow.prune_data_older_than(make_interval(days => 90))$$
);
