-- Privacy: the right of access, and deletion that leaves nothing personal behind (SPEC §41).
--
-- Phase 18. Two pieces live in the database:
--
--   1. export_my_data() — everything stored about the caller, as one JSON document, for the
--      in-app "Export my data" (GDPR arts. 15 and 20).
--   2. A trigger that redacts the RevenueCat webhook log when a user is deleted. Every other
--      user table cascades from auth.users; this one only nulls its user_id, because the
--      event ids must survive for webhook idempotency (SPEC §31) — but the payload inside is
--      the learner's purchase history and must not.
--
-- Deleting the account itself is the delete-account Edge Function: it needs the RevenueCat
-- secret key to delete the customer there too, which a database function must never hold.

insert into public.app_config (key, value, is_public, description) values
  ('rate_limit_exports_per_hour', '10'::jsonb, false,
   'Data exports one learner may request per hour. It is the heaviest read in the product. 0 disables.')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------------------
-- 1. Export
-- ---------------------------------------------------------------------------------------

/**
 * Everything stored about the calling user.
 *
 * Rows are exported whole (`to_jsonb`), so a column added later is included without anyone
 * remembering to add it here. Taken out: the user id repeated on every row (it is in
 * `account`), and other people — a report ABOUT the learner is exported without who filed it.
 * Answer keys are never included: they are not the learner's data, and would hand out the
 * content's answers (SPEC §17).
 */
create or replace function public.export_my_data()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.require_auth_uid();
begin
  perform public.enforce_rate_limit(
    v_uid, 'export', public.config_int('rate_limit_exports_per_hour', 10), interval '1 hour'
  );

  return jsonb_build_object(
    'format', 'codesprint-data-export',
    'version', 1,
    'exported_at', now(),

    'account', (
      select jsonb_build_object(
        'id', u.id,
        'email', u.email,
        'is_anonymous', u.is_anonymous,
        'created_at', u.created_at,
        'last_sign_in_at', u.last_sign_in_at,
        'sign_in_methods', coalesce(
          (select jsonb_agg(distinct i.provider) from auth.identities i where i.user_id = u.id),
          '[]'::jsonb
        )
      )
      from auth.users u where u.id = v_uid
    ),

    'profile', (select to_jsonb(p) - 'id' from public.profiles p where p.id = v_uid),
    'stats', (select to_jsonb(s) - 'user_id' from public.user_stats s where s.user_id = v_uid),

    'xp_events', coalesce((
      select jsonb_agg(to_jsonb(e) - 'user_id' order by e.created_at)
      from public.xp_events e where e.user_id = v_uid
    ), '[]'::jsonb),

    'answers', coalesce((
      select jsonb_agg(to_jsonb(a) - 'user_id' order by a.created_at)
      from public.user_question_attempts a where a.user_id = v_uid
    ), '[]'::jsonb),

    'lesson_progress', coalesce((
      select jsonb_agg(to_jsonb(p) - 'user_id' order by p.started_at)
      from public.user_lesson_progress p where p.user_id = v_uid
    ), '[]'::jsonb),

    'daily_activity', coalesce((
      select jsonb_agg(to_jsonb(d) - 'user_id' order by d.local_date)
      from public.user_daily_activity d where d.user_id = v_uid
    ), '[]'::jsonb),

    'achievements', coalesce((
      select jsonb_agg(
        jsonb_build_object('achievement', a.slug, 'unlocked_at', ua.unlocked_at)
        order by ua.unlocked_at
      )
      from public.user_achievements ua
      join public.achievements a on a.id = ua.achievement_id
      where ua.user_id = v_uid
    ), '[]'::jsonb),

    'daily_challenges', coalesce((
      select jsonb_agg(to_jsonb(c) - 'user_id' order by c.local_date)
      from public.user_daily_challenge_claims c where c.user_id = v_uid
    ), '[]'::jsonb),

    'leaderboard_weeks', coalesce((
      select jsonb_agg(to_jsonb(l) - 'user_id' order by l.week_start)
      from public.leaderboard_weekly l where l.user_id = v_uid
    ), '[]'::jsonb),

    'exams', coalesce((
      select jsonb_agg(to_jsonb(x) - 'user_id' order by x.started_at)
      from public.exam_attempts x where x.user_id = v_uid
    ), '[]'::jsonb),

    'entitlements', coalesce((
      select jsonb_agg(to_jsonb(e) - 'user_id' order by e.entitlement)
      from public.user_entitlements e where e.user_id = v_uid
    ), '[]'::jsonb),

    'purchase_events', coalesce((
      select jsonb_agg(to_jsonb(b) - 'user_id' order by b.received_at)
      from public.billing_events b where b.user_id = v_uid
    ), '[]'::jsonb),

    'rewarded_ads', coalesce((
      select jsonb_agg(to_jsonb(r) - 'user_id' order by r.granted_at)
      from public.rewarded_ad_grants r where r.user_id = v_uid
    ), '[]'::jsonb),

    'reports_filed', coalesce((
      select jsonb_agg(
        jsonb_build_object('reason', r.reason, 'note', r.note, 'status', r.status,
                           'created_at', r.created_at)
        order by r.created_at
      )
      from public.reports r where r.reporter_id = v_uid
    ), '[]'::jsonb),

    -- About the learner, not by them: what was reported, never by whom.
    'reports_about_you', coalesce((
      select jsonb_agg(
        jsonb_build_object('reason', r.reason, 'status', r.status, 'created_at', r.created_at)
        order by r.created_at
      )
      from public.reports r where r.reported_user_id = v_uid
    ), '[]'::jsonb)
  );
end;
$$;

comment on function public.export_my_data() is
  'Everything stored about the caller, as one JSON document (SPEC §41; GDPR arts. 15, 20).';

revoke all on function public.export_my_data() from public, anon, authenticated;
grant execute on function public.export_my_data() to authenticated;

-- ---------------------------------------------------------------------------------------
-- 2. Deletion leaves no purchase history behind
-- ---------------------------------------------------------------------------------------

/**
 * Runs before ANY deletion of an auth user — the in-app deletion, the age gate, the nightly
 * clean-up of abandoned guests, or a deletion from the dashboard — so none of them can forget.
 *
 * The event row stays (its id is what makes a replayed webhook a no-op) and its user_id is
 * nulled by the foreign key; the payload, which is this person's purchase history, goes.
 */
create or replace function public.redact_billing_events_of_deleted_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.billing_events
  set payload = jsonb_build_object('redacted', true, 'reason', 'account deleted')
  where user_id = old.id;
  return old;
end;
$$;

create trigger redact_billing_events_before_user_delete
  before delete on auth.users
  for each row execute function public.redact_billing_events_of_deleted_user();

revoke execute on function public.redact_billing_events_of_deleted_user()
  from public, anon, authenticated;
