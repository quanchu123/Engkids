import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local', quiet: true });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const syncAuth = args.has('--sync-auth');
const includeAdmin = args.has('--include-admin');
const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.split('=')[1]) : null;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

if (limit !== null && (!Number.isInteger(limit) || limit < 1)) {
  console.error('Invalid --limit value. Example: --limit=10');
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const familyNames = [
  'Nguyễn',
  'Trần',
  'Lê',
  'Phạm',
  'Hoàng',
  'Phan',
  'Vũ',
  'Võ',
  'Đặng',
  'Bùi',
  'Đỗ',
  'Ngô',
  'Dương',
  'Lý',
  'Đinh',
  'Lâm',
  'Đoàn',
  'Mai',
  'Trịnh',
  'Đào',
  'Phùng',
  'Lương',
  'Hồ',
  'Cao',
];

const middleNames = {
  male: ['Văn', 'Quốc', 'Minh', 'Anh', 'Thanh', 'Đức', 'Gia', 'Tuấn', 'Hoàng', 'Tiến', 'Hữu', 'Đình'],
  female: ['Thị', 'Thu', 'Ngọc', 'Bảo', 'Khánh', 'Minh', 'Gia', 'Thanh', 'Hoàng', 'Phương', 'Hồng', 'Thùy'],
};

const parentGivenNames = {
  male: ['Việt', 'Hùng', 'Tuấn', 'Đức', 'Hải', 'Sơn', 'Hoàng', 'Khánh', 'Nam', 'Huy', 'Đạt', 'Long', 'Cường', 'Thắng', 'Dũng', 'Phong'],
  female: ['Thảo', 'Mai', 'Trang', 'Hằng', 'Linh', 'Hoa', 'Nhung', 'Huyền', 'Chi', 'Phương', 'Nga', 'Lan', 'Vân', 'Yến'],
};

const childGivenNames = {
  male: ['Kiên', 'Minh', 'Bảo', 'Khang', 'Long', 'Quân', 'Huy', 'Nam', 'Duy', 'Phúc', 'Triết', 'An', 'Đạt', 'Khôi', 'Đăng'],
  female: ['An', 'Linh', 'Nhi', 'Hân', 'My', 'Chi', 'Thảo', 'Anh', 'Trang', 'Ngọc', 'Vy', 'Mai', 'Khuê', 'Hà', 'Nhã'],
};

const addresses = [
  'Thạch Thất',
  'thạch thất, hà nội',
  'Thạch Thất - Hà Nội',
  'Xã Thạch Thất, Hà Nội',
  'Huyện Thạch Thất, Hà Nội',
  'thach that ha noi',
  'Thạch Thất Hà Nội',
  'xã Hòa Lạc, Hà Nội',
  'Xã Hòa Lạc - Hà Nội',
  'Hòa Lạc, Thạch Thất',
  'Hoa Lac, Ha Noi',
  'Khu công nghệ cao Hòa Lạc, Hà Nội',
  'Sơn Tây',
  'Sơn Tây, Hà Nội',
  'TX Sơn Tây - Hà Nội',
  'Thị xã Sơn Tây, Hà Nội',
  'son tay ha noi',
  'Phường Trung Hưng, Sơn Tây',
  'Phường Xuân Khanh, Sơn Tây, Hà Nội',
  'Cầu Giấy, Hà Nội',
  'Hà Đông - Hà Nội',
  'Nam Từ Liêm, Hà Nội',
];

const protectedEmails = new Set([
  'admin@comiclingua.com',
  'viet@ultra.com',
]);

function pick(list, index, salt = 0) {
  return list[(index + salt) % list.length];
}

function pickDistinct(list, index, blocked, salt = 0) {
  const blockedLower = new Set(blocked.map((item) => String(item).toLowerCase()));

  for (let offset = 0; offset < list.length; offset += 1) {
    const value = pick(list, index, salt + offset);
    if (!blockedLower.has(value.toLowerCase())) return value;
  }

  return pick(list, index, salt);
}

function toEmailName(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0111/g, 'd')
    .replace(/\u0110/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function toEmailInitial(value) {
  return toEmailName(value).charAt(0);
}

function cleanEmailBase(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, '')
    .replace(/\.+/g, '.')
    .replace(/^\.+|\.+$/g, '');
}

function uniqueEmailBases(variants) {
  const seen = new Set();
  const bases = [];

  for (const variant of variants) {
    const base = cleanEmailBase(variant);
    if (base.length < 6 || seen.has(base)) continue;
    seen.add(base);
    bases.push(base);
  }

  return bases;
}

function gmailUniquenessKey(email) {
  const [local = '', domain = ''] = String(email).toLowerCase().split('@');
  return domain === 'gmail.com'
    ? `${domain}:${local.replace(/\./g, '')}`
    : `${domain}:${local}`;
}

function hasUsedEmail(email, usedEmails) {
  const normalized = String(email).toLowerCase();
  return usedEmails.has(normalized) || usedEmails.has(gmailUniquenessKey(normalized));
}

function rememberEmail(email, usedEmails) {
  const normalized = String(email).toLowerCase();
  usedEmails.add(normalized);
  usedEmails.add(gmailUniquenessKey(normalized));
}

function makeEmailBases({ familyName, parentMiddle, parentGiven, parentBirthYear, parentBirthDay, parentBirthMonth }, index) {
  const family = toEmailName(familyName);
  const middle = toEmailName(parentMiddle);
  const given = toEmailName(parentGiven);
  const familyInitial = toEmailInitial(familyName);
  const middleInitial = toEmailInitial(parentMiddle);
  const yy = String(parentBirthYear).slice(2);
  const fullYear = String(parentBirthYear);
  const day = String(Number(parentBirthDay));
  const month = String(Number(parentBirthMonth));
  const ddmm = `${parentBirthDay}${parentBirthMonth}`;
  const mmdd = `${parentBirthMonth}${parentBirthDay}`;
  const shortSuffixes = ['01', '02', '09', '88', '99', '123', '168', '247', '6868', '8888'];
  const suffix = pick(shortSuffixes, index, 0);
  const suffixAlt = pick(shortSuffixes, index, 4);

  const variants = uniqueEmailBases([
    `${given}${family}`,
    `${family}${given}`,
    `${family}${middle}${given}`,
    `${given}${middle}${family}`,
    `${given}${middleInitial}${family}`,
    `${family}${middleInitial}${given}`,
    `${familyInitial}${middleInitial}${given}`,
    `${given}${familyInitial}`,
    `${given}${familyInitial}${middleInitial}`,
    `${family}${middle}${given}${fullYear}`,
    `${given}${family}${fullYear}`,
    `${family}${given}${fullYear}`,
    `${given}${family}123`,
    `${family}${given}123`,
    `${given}${family}8888`,
    `${family}${given}8888`,
    `${given}${family}${suffix}`,
    `${family}${given}${suffixAlt}`,
    `${given}${middleInitial}${family}${yy}`,
    `${familyInitial}${middleInitial}${given}${yy}`,
    `${given}${family}${yy}`,
    `${family}${given}${yy}`,
    `${given}${middle}${yy}`,
    `${family}${middle}${given}${yy}`,
    `${given}${middle}${fullYear}`,
    `${given}.${family}`,
    `${family}.${given}`,
    `${given}.${middleInitial}${family}`,
    `${family}.${middleInitial}${given}`,
    `${given}.${familyInitial}${middleInitial}`,
    `${given}.${family}${yy}`,
    `${family}.${given}${fullYear}`,
    `${family}.${middle}.${given}`,
    `${given}${family}${ddmm}`,
    `${given}${family}${mmdd}`,
    `${family}${given}${day}${month}`,
    `${family}${given}${month}${day}`,
    `${given}${middleInitial}${ddmm}`,
    `${given}${family}${index + 101}`,
  ]);

  const start = (index * 7) % variants.length;
  return [...variants.slice(start), ...variants.slice(0, start)];
}

function makeUniqueEmail(bases, usedEmails) {
  for (const base of bases) {
    const email = `${base}@gmail.com`;
    if (!hasUsedEmail(email, usedEmails)) {
      rememberEmail(email, usedEmails);
      return email;
    }
  }

  for (let suffix = 10; suffix < 10000; suffix += 1) {
    const email = `${bases[0]}${suffix}@gmail.com`;
    if (!hasUsedEmail(email, usedEmails)) {
      rememberEmail(email, usedEmails);
      return email;
    }
  }

  throw new Error(`Could not make unique email for ${bases[0]}`);
}

function displayName(parts) {
  return parts.join(' ');
}

function makeTimestamp(index, total) {
  const days = [15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 24, 25, 25, 26, 26, 27, 27, 27];
  const day = days[(index * 5 + Math.floor(index / 3)) % days.length];
  const hourVn = 8 + ((index * 7) % 13);
  const minute = (index * 17 + total) % 60;
  const second = (index * 23) % 60;
  const created = new Date(Date.UTC(2026, 5, day, hourVn - 7, minute, second));
  const bumpHours = 2 + ((index * 11) % 54);
  const latest = new Date(Date.UTC(2026, 5, 27, 14, 30, 0)); // 21:30 on 2026-06-27 in Vietnam.
  const updated = new Date(Math.min(created.getTime() + bumpHours * 60 * 60 * 1000, latest.getTime()));

  return {
    created_at: created.toISOString(),
    updated_at: updated.toISOString(),
  };
}

function isProtectedProfile(profile) {
  if (includeAdmin) return false;

  const email = String(profile.email || '').toLowerCase();
  const role = String(profile.role || '').toLowerCase();
  const accountType = String(profile.account_type || '').toLowerCase();
  const name = String(profile.name || '').toLowerCase();

  return (
    protectedEmails.has(email) ||
    email.includes('admin') ||
    role === 'admin' ||
    role === 'super_admin' ||
    role === 'god' ||
    accountType === 'admin' ||
    name.includes('super admin') ||
    name.includes('god of the web')
  );
}

function makePerson(index, usedEmails, total) {
  const parentGender = index % 4 === 0 ? 'female' : 'male';
  const childGender = index % 3 === 0 ? 'female' : 'male';
  const familyName = pick(familyNames, index, 0);
  const parentGiven = pickDistinct(parentGivenNames[parentGender], index, [familyName], 11);
  const parentMiddle = pickDistinct(middleNames[parentGender], index, [familyName, parentGiven], 7);
  const childGiven = pickDistinct(childGivenNames[childGender], index, [familyName], 13);
  const childMiddle =
    childGender === 'male'
      ? pickDistinct(['Trung', 'Minh', 'Gia', 'Đức', 'Quốc', 'Anh', 'Bảo', 'Nhật'], index, [familyName, childGiven], 5)
      : pickDistinct(['Bảo', 'Ngọc', 'Khánh', 'Minh', 'Thu', 'Gia', 'Phương', 'Nhã'], index, [familyName, childGiven], 5);
  const parentBirthYears = [1995, 1992, 1990, 1989, 1994, 1991, 1988, 1987, 1996, 1993, 1986, 1998, 1997];
  const parentBirthYear = pick(parentBirthYears, index, 0);
  const parentAge = 2026 - parentBirthYear;
  const childAge = pick([5, 6, 7, 8, 5, 6, 7, 8, 4, 5, 6, 7, 8, 9], index, 0);
  const childBirthYear = 2026 - childAge;
  const parentBirthDay = String(((index * 7 + 8) % 28) + 1).padStart(2, '0');
  const parentBirthMonth = String(((index * 5 + 10) % 12) + 1).padStart(2, '0');
  const email = makeUniqueEmail(
    makeEmailBases({ familyName, parentMiddle, parentGiven, parentBirthYear, parentBirthDay, parentBirthMonth }, index),
    usedEmails,
  );

  const birthMonth = String((index % 12) + 1).padStart(2, '0');
  const birthDay = String((index % 27) + 1).padStart(2, '0');
  const timestamps = makeTimestamp(index, total);

  return {
    email,
    name: displayName([familyName, childMiddle, childGiven]),
    parent_name: displayName([familyName, parentMiddle, parentGiven]),
    child_age: childAge,
    parent_age: parentAge,
    gender: childGender,
    birth_date: `${childBirthYear}-${birthMonth}-${birthDay}`,
    address: pick(addresses, index, 0),
    parent_birth_year: parentBirthYear,
    parent_birth_date_hint: `${parentBirthDay}/${parentBirthMonth}/${parentBirthYear}`,
    ...timestamps,
  };
}

async function fetchProfiles() {
  const rows = [];
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await admin
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }

  return rows;
}

async function updateProfile(profile, fake, columns) {
  const desiredPayload = {
    email: fake.email,
    name: fake.name,
    parent_name: fake.parent_name,
    child_age: fake.child_age,
    parent_age: fake.parent_age,
    gender: fake.gender,
    birth_date: fake.birth_date,
    address: fake.address,
    created_at: fake.created_at,
    updated_at: fake.updated_at,
  };

  const payload = Object.fromEntries(
    Object.entries(desiredPayload).filter(([key]) => columns.includes(key)),
  );

  const { error } = await admin
    .from('user_profiles')
    .update(payload)
    .eq('id', profile.id);

  if (error) throw error;
}

async function updateAuthUser(profile, fake) {
  if (!profile.auth_id) return;

  const userMetadata = {
    name: fake.name,
    display_name: fake.name,
    parent_name: fake.parent_name,
    child_age: String(fake.child_age),
    parent_age: String(fake.parent_age),
    gender: fake.gender,
    birth_date: fake.birth_date,
    address: fake.address,
    parent_birth_year: String(fake.parent_birth_year),
    parent_birth_date_hint: fake.parent_birth_date_hint,
  };

  const { error } = await admin.auth.admin.updateUserById(profile.auth_id, {
    email: fake.email,
    email_confirm: true,
    user_metadata: userMetadata,
  });

  if (error) throw error;
}

async function setTemporaryAuthEmail(item, index) {
  if (!item.auth_id) return;

  const tempEmail = `engkids.temp.${index + 1}.${String(item.auth_id).slice(0, 8)}@gmail.com`;
  const { error } = await admin.auth.admin.updateUserById(item.auth_id, {
    email: tempEmail,
    email_confirm: true,
  });

  if (error) throw error;
}

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function writeOutputs(plan) {
  const outDir = path.join(process.cwd(), 'output');
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(outDir, `user-profiles-anonymize-backup-${stamp}.json`);
  const authSqlPath = path.join(outDir, `auth-users-created-at-update-${stamp}.sql`);

  fs.writeFileSync(
    backupPath,
    JSON.stringify(
      {
        created_at: new Date().toISOString(),
        apply,
        syncAuth,
        includeAdmin,
        total: plan.length,
        rows: plan,
      },
      null,
      2,
    ),
  );

  const statements = [
    '-- Optional: run this in Supabase SQL Editor only if auth.users timestamps must match user_profiles.',
    '-- The script updates public.user_profiles.created_at directly, but Supabase Admin API cannot update auth.users.created_at.',
    'begin;',
    ...plan
      .filter((item) => item.auth_id)
      .map((item) => (
        `update auth.users set created_at = ${sqlString(item.fake.created_at)}, updated_at = ${sqlString(item.fake.updated_at)} where id = ${sqlString(item.auth_id)};`
      )),
    'commit;',
    '',
  ];
  fs.writeFileSync(authSqlPath, statements.join('\n'));

  return { backupPath, authSqlPath };
}

function printPreview(plan, skipped, totalProfiles, candidateProfiles) {
  console.log(`Profiles found: ${totalProfiles}`);
  console.log(`Eligible non-admin profiles: ${candidateProfiles}`);
  console.log(`Will anonymize: ${plan.length}`);
  console.log(`Skipped protected/admin: ${skipped.length}`);
  console.log(`Mode: ${apply ? 'APPLY' : 'DRY RUN'}`);
  console.log(`Auth email sync: ${syncAuth ? 'yes' : 'no'}`);
  console.log('');

  for (const item of plan.slice(0, 10)) {
    console.log(`${item.old.email || '(no email)'} -> ${item.fake.email}`);
    console.log(`  child: ${item.fake.name}, parent: ${item.fake.parent_name}, ages: ${item.fake.child_age}/${item.fake.parent_age}`);
    console.log(`  parent DOB hint: ${item.fake.parent_birth_date_hint}, address: ${item.fake.address}`);
    console.log(`  created_at: ${item.fake.created_at}`);
  }

  if (plan.length > 10) {
    console.log(`...and ${plan.length - 10} more`);
  }
}

async function main() {
  const profiles = await fetchProfiles();
  const candidateProfiles = profiles.filter((profile) => !isProtectedProfile(profile));
  const targetProfiles = candidateProfiles.slice(0, limit ?? undefined);
  const skipped = profiles.filter((profile) => isProtectedProfile(profile));
  const usedEmails = new Set(skipped.map((profile) => String(profile.email || '').toLowerCase()).filter(Boolean));

  const plan = targetProfiles.map((profile, index) => ({
    id: profile.id,
    auth_id: profile.auth_id,
    old: {
      email: profile.email,
      name: profile.name,
      parent_name: profile.parent_name,
      child_age: profile.child_age,
      parent_age: profile.parent_age,
      gender: profile.gender,
      birth_date: profile.birth_date,
      address: profile.address,
      role: profile.role,
      account_type: profile.account_type,
    },
    columns: Object.keys(profile),
    fake: makePerson(index, usedEmails, targetProfiles.length),
  }));

  printPreview(plan, skipped, profiles.length, candidateProfiles.length);
  const { backupPath, authSqlPath } = writeOutputs(plan);
  console.log('');
  console.log(`Backup/plan written: ${backupPath}`);
  console.log(`Optional auth timestamp SQL written: ${authSqlPath}`);

  if (!apply) {
    console.log('');
    console.log('Dry run only. Add --apply to update user_profiles, and --sync-auth to also update Supabase Auth emails.');
    return;
  }

  if (syncAuth) {
    console.log('');
    console.log('Moving auth emails to temporary Gmail addresses to avoid batch conflicts...');
    for (const [index, item] of plan.entries()) {
      await setTemporaryAuthEmail(item, index);
    }
  }

  for (const [index, item] of plan.entries()) {
    await updateProfile({ ...item.old, id: item.id, auth_id: item.auth_id }, item.fake, item.columns);
    if (syncAuth) await updateAuthUser({ auth_id: item.auth_id }, item.fake);
    console.log(`[${index + 1}/${plan.length}] updated ${item.fake.email}`);
  }

  console.log('');
  console.log('Done.');
}

main().catch((error) => {
  console.error('Failed:', error.message || error);
  process.exit(1);
});
