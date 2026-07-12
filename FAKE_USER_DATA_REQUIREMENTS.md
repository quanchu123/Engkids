# Fake User Data Requirements

This file records the user's requirements for generating/faking Supabase user data for the Engkids project. In a new chat, read this file before editing or generating user data.

## Supabase Scope

- Project ref: `nmsaxkusgrdjjaztfmie`
- Main table: `public.user_profiles`
- Keep admin/protected accounts unchanged unless explicitly requested.
- User-facing fake data should be applied to `public.user_profiles`.
- If login email must match the fake email, also sync Supabase Auth email via service role.
- `auth.users.created_at` cannot be changed through Supabase Admin API; generate SQL for Supabase SQL Editor if Auth timestamps must match.

## Target Counts

- Total normal/demo registered users: `154`
- Admin/protected accounts are extra and should not be counted in the 154.
- Current expected total rows may be `159` because it includes `154` normal users + `5` admin/protected rows.

## Append Batch Added 2026-06-29

- Do not rebalance or rewrite the original 154 demo users when adding these records.
- Append-only batch created `14` extra normal/demo accounts:
  - `8` new accounts with `public.user_profiles.created_at` on `28/06/2026` Vietnam date.
  - `6` new accounts with `public.user_profiles.created_at` on `29/06/2026` Vietnam date.
- After this append batch, verified counts were:
  - `169` normal users.
  - `5` admin/protected users.
  - `174` total `public.user_profiles` rows.
  - Normal-user date counts include `8` on `28/06/2026` and `7` on `29/06/2026` because one normal user already existed on `29/06/2026` before the append.
- Append command:
  - Dry run: `npm run users:demo-append-june-28-29`
  - Apply: `npm run users:demo-append-june-28-29:apply`
- Latest append outputs:
  - `output/demo-registrations-append-2026-06-28-29-2026-06-29T09-07-04-302Z.json`
  - `output/demo-auth-users-append-created-at-update-2026-06-29T09-07-04-302Z.sql`

## Registration Time Rules

- Among the 154 normal users:
  - Spread the registrations as close to `10/07/2026` as possible while keeping each day between `5` and `10` users.
  - For the current `154`-user target, the actual window becomes `25/06/2026` through `10/07/2026`.
  - That window yields `9-10` users per day.
- Use Vietnam timezone (`Asia/Ho_Chi_Minh`) when reasoning about display times.
- Supabase stores timestamps as UTC, so convert Vietnam-local times before writing `created_at`.

## Email Rules

- All normal/demo users should use `@gmail.com`.
- Emails must look realistic and diverse.
- Emails should be based on the parent's name, not random unrelated strings.
- Email local parts may use:
  - No number: `nguyenquocviet@gmail.com`
  - Two-digit birth year: `tuanvo87@gmail.com`
  - Full birth year: `trinhminhtuan1989@gmail.com`
  - Birth day/month: `dungngo0206@gmail.com`
  - Simple suffixes: `tuanvo123@gmail.com`, `tranhai8888@gmail.com`
  - Dot separators: `le.son@gmail.com`, `chi.phan91@gmail.com`
- Do not make every email follow the same pattern.
- If an email contains a year-like number, keep it logically consistent with the parent's age/birth year.
- Parent age should generally be `28-40`.

## Name Rules

- `user_profiles.name` is the child's name.
- `user_profiles.parent_name` is the parent name.
- Parent and child should share the same Vietnamese family name.
- Names should be Vietnamese and realistic.
- Example:
  - Email: `nguyenquocviet@gmail.com`
  - Parent: `Nguyễn Quốc Việt`
  - Child: `Nguyễn Trung Kiên`
- If email is `vietnguyen95@gmail.com`, it should imply a parent named something like `Nguyễn ... Việt`, born around `1995`.

## Child Rules

- Child age should be `4-9`.
- Most children should be `5-8`.
- Current accepted distribution example:
  - 4 years old: 11
  - 5 years old: 33
  - 6 years old: 33
  - 7 years old: 33
  - 8 years old: 33
  - 9 years old: 11

## Address Rules

- Primary target areas:
  - Thạch Thất
  - Hòa Lạc
  - Sơn Tây
- A small number can be in inner Hanoi.
- Address strings should vary naturally, for example:
  - `Thạch Thất`
  - `thạch thất, hà nội`
  - `Thạch Thất - Hà Nội`
  - `Xã Thạch Thất, Hà Nội`
  - `Hòa Lạc, Thạch Thất`
  - `xã Hòa Lạc, Hà Nội`
  - `Sơn Tây`
  - `sơn tây, hà nội`
  - `TX Sơn Tây`
  - `Phường Trung Hưng, Sơn Tây`
  - `son tay ha noi`
- Keep the distribution mixed across Sơn Tây, Thạch Thất, and Hòa Lạc variants.

## Existing Scripts

- Main script for target 154 demo registrations:
  - `scripts/ensure-demo-registrations.mjs`
- Earlier anonymization script:
  - `scripts/anonymize-user-profiles.mjs`
- NPM commands:
  - Dry run: `npm run users:demo-registrations`
  - Apply: `npm run users:demo-registrations:apply`
  - Exported email list command was run manually and produced files under `output/`.

## Exported Files

- Email-only list:
  - `output/demo-user-emails-154.txt`
- CSV with email, parent, child, age, address, registration time:
  - `output/demo-user-emails-154.csv`

## Verification Checklist

After applying changes, verify:

- Normal users count is `154`.
- Admin/protected count remains unchanged.
- Normal user emails are all `@gmail.com`.
- Email patterns are diverse:
  - Some without numbers.
  - Some with `123`.
  - Some with `8888`.
  - Some with two-digit birth year.
  - Some with full birth year.
  - Some with birth day/month.
- Registration dates run from `25/06/2026` through `10/07/2026`.
- Daily counts stay between `9` and `10` users for the current `154`-user target.
- Supabase Auth email matches `public.user_profiles.email` for normal users.

## Recent Week Append Added 2026-07-13

- Appended `21` extra normal/demo accounts to bring underfilled recent-week days up to `5` users/day.
- Days updated:
  - `07/07/2026`: added `3` users.
  - `08/07/2026`: added `4` users.
  - `09/07/2026`: added `4` users.
  - `11/07/2026`: added `5` users.
  - `13/07/2026`: added `5` users.
- `10/07/2026` already had `14` normal users, so it was left unchanged.
- Verified counts after apply:
  - `231` normal users.
  - `5` admin/protected users.
  - `236` total rows.
  - Recent-week daily counts: `5`, `5`, `5`, `14`, `5`, `5`, `5`.
- Generated files:
  - `output/demo-registrations-append-recent-week-2026-07-12T17-55-46-940Z.json`
  - `output/demo-auth-users-append-recent-week-created-at-update-2026-07-12T17-55-46-940Z.sql`
- NPM commands:
  - Dry run: `npm run users:demo-append-last-week`
  - Apply: `npm run users:demo-append-last-week:apply`

## Natural Registration Times Applied 2026-07-13

- Re-randomized `public.user_profiles.created_at` and `updated_at` for all `231` normal users.
- Kept `5` admin/protected rows unchanged.
- Registration window uses Vietnam time from `18/06/2026` through `13/07/2026 19:00`.
- Times are spaced apart and biased toward realistic usage windows:
  - Morning before school/work.
  - Lunch break.
  - Late afternoon.
  - Evening and limited late-night activity.
- Premium users:
  - `15` normal premium users were linked to first `PAID` transaction.
  - Each premium registration was moved to `2-6` days before purchase.
  - Verified final premium registration-to-purchase deltas are `2.66` to `6.49` days.
- Verification after apply:
  - `236` total `public.user_profiles` rows.
  - `231` normal users.
  - `5` admin/protected users.
  - Latest `13/07/2026` registration is `18:49:46` Vietnam time.
  - No premium user registered after purchase or less than 2 days before purchase.
- Generated files:
  - `output/natural-registration-times-2026-07-12T18-05-11-563Z.json`
  - `output/natural-registration-auth-users-created-at-update-2026-07-12T18-05-11-563Z.sql`
- NPM commands:
  - Dry run: `npm run users:naturalize-registration-times`
  - Apply: `npm run users:naturalize-registration-times:apply`
