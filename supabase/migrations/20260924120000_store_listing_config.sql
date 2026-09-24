-- Where the forced-update screen sends an iOS learner (SPEC §50, §51; Phase 22).
--
-- Android's listing URL follows from the package name; the App Store's is a numeric id that
-- exists only once the app is created in App Store Connect. Until it is set here, the iOS
-- update screen explains what to do instead of offering a link to nowhere.

insert into public.app_config (key, value, is_public, description) values
  ('ios_app_store_id', 'null'::jsonb, true,
   'Numeric App Store id of the listing (App Store Connect → App Information → Apple ID). Set it once the app exists.')
on conflict (key) do nothing;
