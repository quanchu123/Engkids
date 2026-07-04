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
  - `47` users must have registration date `14/06/2026`.
  - These 47 users must be in Son Tay.
  - These 47 users must register in the evening, around `20:00-22:00` Vietnam time.
  - The remaining `107` users should be distributed from `15/06/2026` to `27/06/2026`.
- Use Vietnam timezone (`Asia/Ho_Chi_Minh`) when reasoning about display times.
- Supabase stores timestamps as UTC, so `20:00` Vietnam time is `13:00Z`.

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
- For the 47 users on `14/06/2026`, all addresses must be Son Tay variants.

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
- `47` users are on `14/06/2026` Vietnam date.
- Those 47 users are all in Son Tay.
- Those 47 users are all registered between `20:00` and `22:00` Vietnam time.
- Remaining `107` users are from `15/06/2026` through `27/06/2026`.
- Supabase Auth email matches `public.user_profiles.email` for normal users.
