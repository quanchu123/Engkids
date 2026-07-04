import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local', quiet: true });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const syncAuth = !args.has('--no-sync-auth');
const appendJune2829 = args.has('--append-june-28-29');
const targetCountArg = process.argv.find((arg) => arg.startsWith('--target-count='));
const sonTayCountArg = process.argv.find((arg) => arg.startsWith('--son-tay-14-count='));
const targetCount = targetCountArg ? Number(targetCountArg.split('=')[1]) : 154;
const sonTay14Count = sonTayCountArg ? Number(sonTayCountArg.split('=')[1]) : 47;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

if (!Number.isInteger(targetCount) || targetCount < 1 || !Number.isInteger(sonTay14Count) || sonTay14Count < 0 || sonTay14Count > targetCount) {
  console.error('Invalid target count. Example: --target-count=154 --son-tay-14-count=47');
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const familyNames = [
  'Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi',
  'Đỗ', 'Ngô', 'Dương', 'Lý', 'Đinh', 'Lâm', 'Đoàn', 'Mai', 'Trịnh', 'Đào',
  'Phùng', 'Lương', 'Hồ', 'Cao', 'Tạ', 'Hà', 'Chu', 'Tô', 'Đoàn', 'Đỗ',
];

const middleNames = {
  male: ['Văn', 'Quốc', 'Minh', 'Anh', 'Thanh', 'Đức', 'Gia', 'Tuấn', 'Hoàng', 'Tiến', 'Hữu', 'Đình', 'Duy', 'Nhật'],
  female: ['Thị', 'Thu', 'Ngọc', 'Bảo', 'Khánh', 'Minh', 'Gia', 'Thanh', 'Hoàng', 'Phương', 'Hồng', 'Thùy', 'Mai', 'Diệu'],
};

const parentGivenNames = {
  male: ['Việt', 'Hùng', 'Tuấn', 'Đức', 'Hải', 'Sơn', 'Hoàng', 'Khánh', 'Nam', 'Huy', 'Đạt', 'Long', 'Cường', 'Thắng', 'Dũng', 'Phong', 'Tài', 'Kiên', 'Quân', 'Tùng'],
  female: ['Thảo', 'Mai', 'Trang', 'Hằng', 'Linh', 'Hoa', 'Nhung', 'Huyền', 'Chi', 'Phương', 'Nga', 'Lan', 'Vân', 'Yến', 'Hiền', 'Hà', 'Loan', 'Vy'],
};

const childGivenNames = {
  male: ['Kiên', 'Minh', 'Bảo', 'Khang', 'Long', 'Quân', 'Huy', 'Nam', 'Duy', 'Phúc', 'Triết', 'An', 'Đạt', 'Khôi', 'Đăng', 'Gia', 'Tín', 'Bình'],
  female: ['An', 'Linh', 'Nhi', 'Hân', 'My', 'Chi', 'Thảo', 'Anh', 'Trang', 'Ngọc', 'Vy', 'Mai', 'Khuê', 'Hà', 'Nhã', 'Bảo', 'Minh'],
};

const sonTayAddresses = [
  'Sơn Tây',
  'sơn tây, hà nội',
  'Sơn Tây - Hà Nội',
  'Thị xã Sơn Tây, Hà Nội',
  'TX Sơn Tây',
  'TX. Sơn Tây, Hà Nội',
  'son tay ha noi',
  'Phường Trung Hưng, Sơn Tây',
  'Phường Xuân Khanh, Sơn Tây, Hà Nội',
  'Phường Quang Trung - Sơn Tây',
  'Phường Lê Lợi, Sơn Tây',
  'Đường Lâm, Sơn Tây',
  'Cổ Đông, Sơn Tây, Hà Nội',
];

const targetAreaAddresses = [
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
  ...sonTayAddresses,
];

const innerHanoiAddresses = [
  'Cầu Giấy, Hà Nội',
  'Hà Đông - Hà Nội',
  'Nam Từ Liêm, Hà Nội',
  'Thanh Xuân, Hà Nội',
  'Đống Đa, Hà Nội',
];

const protectedEmails = new Set(['admin@comiclingua.com', 'viet@ultra.com']);

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

function toEmailToken(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0111/g, 'd')
    .replace(/\u0110/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function toEmailInitial(value) {
  return toEmailToken(value).charAt(0);
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

function displayName(parts) {
  return parts.join(' ');
}

function isProtectedProfile(profile) {
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

function makeCreatedAt(index) {
  if (index < sonTay14Count) {
    const minuteOffset = Math.floor((index * 120) / sonTay14Count);
    const hour = 20 + Math.floor(minuteOffset / 60);
    const minute = minuteOffset % 60;
    const second = (index * 17) % 60;
    return new Date(Date.UTC(2026, 5, 14, hour - 7, minute, second)).toISOString();
  }

  const remainingIndex = index - sonTay14Count;
  const remainingCount = targetCount - sonTay14Count;
  const dayOffset = Math.floor((remainingIndex * 13) / remainingCount);
  const day = 15 + Math.min(dayOffset, 12);
  const hourVn = 7 + ((remainingIndex * 5) % 15);
  const minute = (remainingIndex * 19 + 7) % 60;
  const second = (remainingIndex * 23) % 60;
  return new Date(Date.UTC(2026, 5, day, hourVn - 7, minute, second)).toISOString();
}

function makeUpdatedAt(createdAt, index) {
  const created = new Date(createdAt);
  const bumpMinutes = 20 + ((index * 37) % (48 * 60));
  const latest = new Date(Date.UTC(2026, 5, 27, 15, 0, 0));
  return new Date(Math.min(created.getTime() + bumpMinutes * 60 * 1000, latest.getTime())).toISOString();
}

function makeUpdatedAtAfter(createdAt, index) {
  const created = new Date(createdAt);
  const bumpMinutes = 12 + ((index * 29) % 180);
  return new Date(created.getTime() + bumpMinutes * 60 * 1000).toISOString();
}

function getVietnamDateKey(value) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
}

function makeVietnamCreatedAt(year, month, day, index, total) {
  const datePlans = {
    '2026-06-28': [
      [8, 18], [9, 42], [11, 5], [13, 27], [15, 36], [17, 12], [19, 48], [21, 6],
    ],
    '2026-06-29': [
      [8, 9], [9, 33], [10, 58], [12, 16], [14, 24], [15, 47],
    ],
  };
  const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const plan = datePlans[key];
  const [hourVn, minute] = plan?.[index % plan.length] ?? [
    8 + Math.floor((index * 12) / Math.max(total, 1)),
    (index * 17 + 11) % 60,
  ];
  const second = (index * 19 + total) % 60;
  return new Date(Date.UTC(year, month - 1, day, hourVn - 7, minute, second)).toISOString();
}

function makeEmailBases({ familyName, parentMiddle, parentGiven, parentBirthYear, parentBirthDay, parentBirthMonth }, index) {
  const family = toEmailToken(familyName);
  const middle = toEmailToken(parentMiddle);
  const given = toEmailToken(parentGiven);
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

function makePerson(index, usedEmails, overrides = {}) {
  const parentGender = index % 5 === 0 ? 'female' : 'male';
  const childGender = index % 3 === 1 ? 'female' : 'male';
  const familyName = pick(familyNames, index, 0);
  const parentGiven = pickDistinct(parentGivenNames[parentGender], index, [familyName], 3);
  const parentMiddle = pickDistinct(middleNames[parentGender], index, [familyName, parentGiven], 7);
  const childGiven = pickDistinct(childGivenNames[childGender], index, [familyName], 11);
  const childMiddle =
    childGender === 'male'
      ? pickDistinct(['Trung', 'Minh', 'Gia', 'Đức', 'Quốc', 'Anh', 'Bảo', 'Nhật', 'Duy'], index, [familyName, childGiven], 5)
      : pickDistinct(['Bảo', 'Ngọc', 'Khánh', 'Minh', 'Thu', 'Gia', 'Phương', 'Nhã'], index, [familyName, childGiven], 5);
  const parentBirthYear = pick([1995, 1992, 1990, 1989, 1994, 1991, 1988, 1987, 1996, 1993, 1986, 1998, 1997], index, 0);
  const parentAge = 2026 - parentBirthYear;
  const childAge = pick([5, 6, 7, 8, 5, 6, 7, 8, 4, 5, 6, 7, 8, 9], index, 0);
  const childBirthYear = 2026 - childAge;
  const parentBirthDay = String(((index * 7 + 8) % 28) + 1).padStart(2, '0');
  const parentBirthMonth = String(((index * 5 + 10) % 12) + 1).padStart(2, '0');
  const childBirthMonth = String((index % 12) + 1).padStart(2, '0');
  const childBirthDay = String((index % 27) + 1).padStart(2, '0');
  const createdAt = overrides.created_at || makeCreatedAt(index);
  const address = overrides.address || (
    index < sonTay14Count
      ? pick(sonTayAddresses, index, 0)
      : (index % 17 === 0 ? pick(innerHanoiAddresses, index, 0) : pick(targetAreaAddresses, index, 3))
  );

  const email = makeUniqueEmail(
    makeEmailBases({ familyName, parentMiddle, parentGiven, parentBirthYear, parentBirthDay, parentBirthMonth }, index),
    usedEmails,
  );

  return {
    email,
    name: displayName([familyName, childMiddle, childGiven]),
    parent_name: displayName([familyName, parentMiddle, parentGiven]),
    child_age: childAge,
    parent_age: parentAge,
    gender: childGender,
    birth_date: `${childBirthYear}-${childBirthMonth}-${childBirthDay}`,
    address,
    created_at: createdAt,
    updated_at: overrides.updated_at || makeUpdatedAt(createdAt, index),
    parent_birth_year: parentBirthYear,
    parent_birth_date_hint: `${parentBirthDay}/${parentBirthMonth}/${parentBirthYear}`,
  };
}

function makePassword() {
  return `Engkids@${crypto.randomBytes(5).toString('hex')}A1`;
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

async function createMissingUsers(count) {
  const created = [];
  for (let i = 0; i < count; i += 1) {
    const email = `engkids.seed.tmp.${Date.now()}.${i}.${crypto.randomBytes(3).toString('hex')}@gmail.com`;
    const password = makePassword();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name: 'Engkids Demo',
        display_name: 'Engkids Demo',
      },
    });
    if (error) throw error;

    const { error: profileError } = await admin
      .from('user_profiles')
      .upsert(
        {
          auth_id: data.user.id,
          email,
          name: 'Engkids Demo',
          role: 'user',
          account_type: 'free',
        },
        { onConflict: 'auth_id' },
      );
    if (profileError) throw profileError;

    created.push({ auth_id: data.user.id, temp_email: email, password });
    console.log(`[create ${i + 1}/${count}] ${email}`);
  }
  return created;
}

async function updateProfile(item) {
  const desiredPayload = {
    email: item.fake.email,
    name: item.fake.name,
    parent_name: item.fake.parent_name,
    child_age: item.fake.child_age,
    parent_age: item.fake.parent_age,
    gender: item.fake.gender,
    birth_date: item.fake.birth_date,
    address: item.fake.address,
    created_at: item.fake.created_at,
    updated_at: item.fake.updated_at,
  };
  const payload = Object.fromEntries(Object.entries(desiredPayload).filter(([key]) => item.columns.includes(key)));
  const { error } = await admin.from('user_profiles').update(payload).eq('id', item.id);
  if (error) throw error;
}

async function setTemporaryAuthEmail(item, index) {
  if (!item.auth_id) return;
  const tempEmail = `engkids.final.tmp.${index + 1}.${String(item.auth_id).slice(0, 8)}@gmail.com`;
  const { error } = await admin.auth.admin.updateUserById(item.auth_id, {
    email: tempEmail,
    email_confirm: true,
  });
  if (error) throw error;
}

async function updateAuthUser(item) {
  if (!item.auth_id) return;
  const { error } = await admin.auth.admin.updateUserById(item.auth_id, {
    email: item.fake.email,
    email_confirm: true,
    user_metadata: {
      name: item.fake.name,
      display_name: item.fake.name,
      parent_name: item.fake.parent_name,
      child_age: String(item.fake.child_age),
      parent_age: String(item.fake.parent_age),
      gender: item.fake.gender,
      birth_date: item.fake.birth_date,
      address: item.fake.address,
      parent_birth_year: String(item.fake.parent_birth_year),
      parent_birth_date_hint: item.fake.parent_birth_date_hint,
    },
  });
  if (error) throw error;
}

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function profilePayloadForFake(authId, fake, columns) {
  const desiredPayload = {
    auth_id: authId,
    email: fake.email,
    name: fake.name,
    parent_name: fake.parent_name,
    child_age: fake.child_age,
    parent_age: fake.parent_age,
    gender: fake.gender,
    birth_date: fake.birth_date,
    address: fake.address,
    role: 'user',
    account_type: 'free',
    created_at: fake.created_at,
    updated_at: fake.updated_at,
  };

  if (!columns?.length) return desiredPayload;
  return Object.fromEntries(Object.entries(desiredPayload).filter(([key]) => columns.includes(key)));
}

function writeAppendOutputs({ plan, createdUsers }) {
  const outDir = path.join(process.cwd(), 'output');
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const planPath = path.join(outDir, `demo-registrations-append-2026-06-28-29-${stamp}.json`);
  const authSqlPath = path.join(outDir, `demo-auth-users-append-created-at-update-${stamp}.sql`);

  fs.writeFileSync(
    planPath,
    JSON.stringify({ created_at: new Date().toISOString(), apply, mode: 'append-june-28-29', createdUsers, rows: plan }, null, 2),
  );

  fs.writeFileSync(
    authSqlPath,
    [
      '-- Optional: run this in Supabase SQL Editor if auth.users timestamps must match user_profiles.',
      '-- This append mode does not update existing users.',
      'begin;',
      ...plan
        .filter((item) => item.auth_id)
        .map((item) => `update auth.users set created_at = ${sqlString(item.fake.created_at)}, updated_at = ${sqlString(item.fake.updated_at)} where id = ${sqlString(item.auth_id)};`),
      'commit;',
      '',
    ].join('\n'),
  );

  return { planPath, authSqlPath };
}

function writeOutputs({ plan, createdUsers }) {
  const outDir = path.join(process.cwd(), 'output');
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(outDir, `demo-registrations-plan-${stamp}.json`);
  const authSqlPath = path.join(outDir, `demo-auth-users-created-at-update-${stamp}.sql`);

  fs.writeFileSync(
    backupPath,
    JSON.stringify({ created_at: new Date().toISOString(), apply, syncAuth, targetCount, sonTay14Count, createdUsers, rows: plan }, null, 2),
  );

  fs.writeFileSync(
    authSqlPath,
    [
      '-- Optional: run this in Supabase SQL Editor if auth.users timestamps must match user_profiles.',
      'begin;',
      ...plan
        .filter((item) => item.auth_id)
        .map((item) => `update auth.users set created_at = ${sqlString(item.fake.created_at)}, updated_at = ${sqlString(item.fake.updated_at)} where id = ${sqlString(item.auth_id)};`),
      'commit;',
      '',
    ].join('\n'),
  );

  return { backupPath, authSqlPath };
}

function printPreview(plan, protectedRows, missingCount) {
  console.log(`Target normal users: ${targetCount}`);
  console.log(`Protected/admin rows: ${protectedRows.length}`);
  console.log(`Will create missing users: ${missingCount}`);
  console.log(`Will update normal users: ${plan.length}`);
  console.log(`14/06 Son Tay evening users: ${sonTay14Count}`);
  console.log(`Mode: ${apply ? 'APPLY' : 'DRY RUN'}`);
  console.log(`Auth email sync: ${syncAuth ? 'yes' : 'no'}`);
  console.log('');
  for (const item of plan.slice(0, 12)) {
    console.log(`${item.old.email || '(no email)'} -> ${item.fake.email}`);
    console.log(`  parent=${item.fake.parent_name} (${item.fake.parent_birth_date_hint}) child=${item.fake.name} (${item.fake.child_age})`);
    console.log(`  address=${item.fake.address} created_at=${item.fake.created_at}`);
  }
  if (plan.length > 12) console.log(`...and ${plan.length - 12} more`);
}

function buildAppendPlan(profiles) {
  const protectedRows = profiles.filter(isProtectedProfile);
  const normalRows = profiles.filter((profile) => !isProtectedProfile(profile));
  const usedEmails = new Set();
  for (const profile of profiles) {
    if (profile.email) rememberEmail(profile.email, usedEmails);
  }

  const dateTargets = [
    { date: '2026-06-28', year: 2026, month: 6, day: 28, target: 8 },
    { date: '2026-06-29', year: 2026, month: 6, day: 29, target: 6 },
  ];

  const existingByDate = new Map();
  for (const profile of normalRows) {
    if (!profile.created_at) continue;
    const dateKey = getVietnamDateKey(profile.created_at);
    existingByDate.set(dateKey, (existingByDate.get(dateKey) || 0) + 1);
  }

  const plan = [];
  for (const target of dateTargets) {
    for (let offset = 0; offset < target.target; offset += 1) {
      const dateSequence = offset;
      const personIndex = normalRows.length + plan.length;
      const createdAt = makeVietnamCreatedAt(target.year, target.month, target.day, dateSequence, target.target);
      const fake = makePerson(personIndex, usedEmails, {
        created_at: createdAt,
        updated_at: makeUpdatedAtAfter(createdAt, personIndex),
        address: personIndex % 9 === 0
          ? pick(innerHanoiAddresses, personIndex, 0)
          : pick(targetAreaAddresses, personIndex, 5),
      });

      plan.push({
        date: target.date,
        sequence: dateSequence + 1,
        auth_id: null,
        fake,
      });
    }
  }

  return { plan, protectedRows, normalRows, existingByDate };
}

function printAppendPreview({ plan, protectedRows, normalRows, existingByDate }) {
  console.log('Mode: append 2026-06-28/29 only');
  console.log(`Protected/admin rows: ${protectedRows.length}`);
  console.log(`Current normal users: ${normalRows.length}`);
  console.log(`Existing 2026-06-28 normal users: ${existingByDate.get('2026-06-28') || 0}`);
  console.log(`Existing 2026-06-29 normal users: ${existingByDate.get('2026-06-29') || 0}`);
  console.log(`Will create new users: ${plan.length}`);
  console.log(`Mode: ${apply ? 'APPLY' : 'DRY RUN'}`);
  console.log('');

  for (const item of plan) {
    const createdAtVn = new Date(item.fake.created_at).toLocaleString('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour12: false,
    });
    console.log(`${item.fake.email}`);
    console.log(`  date=${item.date} created_at_vn=${createdAtVn}`);
    console.log(`  parent=${item.fake.parent_name} child=${item.fake.name} (${item.fake.child_age}) address=${item.fake.address}`);
  }
}

async function createAppendUser(item, columns) {
  const password = makePassword();
  const { data, error } = await admin.auth.admin.createUser({
    email: item.fake.email,
    password,
    email_confirm: true,
    user_metadata: {
      name: item.fake.name,
      display_name: item.fake.name,
      parent_name: item.fake.parent_name,
      child_age: String(item.fake.child_age),
      parent_age: String(item.fake.parent_age),
      gender: item.fake.gender,
      birth_date: item.fake.birth_date,
      address: item.fake.address,
      parent_birth_year: String(item.fake.parent_birth_year),
      parent_birth_date_hint: item.fake.parent_birth_date_hint,
    },
  });
  if (error) throw error;

  try {
    const { error: profileError } = await admin
      .from('user_profiles')
      .upsert(profilePayloadForFake(data.user.id, item.fake, columns), { onConflict: 'auth_id' });
    if (profileError) throw profileError;
  } catch (error) {
    await admin.auth.admin.deleteUser(data.user.id).catch(() => {});
    throw error;
  }

  item.auth_id = data.user.id;
  return { auth_id: data.user.id, email: item.fake.email, password };
}

async function appendJune2829Users() {
  const profiles = await fetchProfiles();
  const columns = profiles[0] ? Object.keys(profiles[0]) : [];
  const context = buildAppendPlan(profiles);

  printAppendPreview(context);
  let createdUsers = [];

  if (apply && context.plan.length > 0) {
    console.log('');
    console.log('Creating append-only demo users...');
    for (const [index, item] of context.plan.entries()) {
      const created = await createAppendUser(item, columns);
      createdUsers.push(created);
      console.log(`[${index + 1}/${context.plan.length}] ${created.email}`);
    }
  }

  const { planPath, authSqlPath } = writeAppendOutputs({ plan: context.plan, createdUsers });
  console.log('');
  console.log(`Append plan written: ${planPath}`);
  console.log(`Optional auth timestamp SQL written: ${authSqlPath}`);

  if (!apply) {
    console.log('');
    console.log('Dry run only. Add --apply to create append-only users.');
    return;
  }

  console.log('Done.');
}

async function main() {
  if (appendJune2829) {
    await appendJune2829Users();
    return;
  }

  let profiles = await fetchProfiles();
  let protectedRows = profiles.filter(isProtectedProfile);
  let normalRows = profiles.filter((profile) => !isProtectedProfile(profile));
  const missingCount = Math.max(0, targetCount - normalRows.length);

  if (!apply && missingCount > 0) {
    console.log(`Dry run: ${missingCount} users would be created before update.`);
  }

  let createdUsers = [];
  if (apply && missingCount > 0) {
    console.log(`Creating ${missingCount} missing users...`);
    createdUsers = await createMissingUsers(missingCount);
    profiles = await fetchProfiles();
    protectedRows = profiles.filter(isProtectedProfile);
    normalRows = profiles.filter((profile) => !isProtectedProfile(profile));
  }

  normalRows = normalRows
    .sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')))
    .slice(0, targetCount);

  const usedEmails = new Set(protectedRows.map((profile) => String(profile.email || '').toLowerCase()).filter(Boolean));
  const plan = normalRows.map((profile, index) => ({
    id: profile.id,
    auth_id: profile.auth_id,
    columns: Object.keys(profile),
    old: {
      email: profile.email,
      name: profile.name,
      parent_name: profile.parent_name,
      child_age: profile.child_age,
      parent_age: profile.parent_age,
      address: profile.address,
      created_at: profile.created_at,
    },
    fake: makePerson(index, usedEmails),
  }));

  printPreview(plan, protectedRows, missingCount);
  const { backupPath, authSqlPath } = writeOutputs({ plan, createdUsers });
  console.log('');
  console.log(`Plan written: ${backupPath}`);
  console.log(`Optional auth timestamp SQL written: ${authSqlPath}`);

  if (!apply) {
    console.log('');
    console.log('Dry run only. Add --apply to create/update Supabase data.');
    return;
  }

  if (syncAuth) {
    console.log('');
    console.log('Moving auth emails to temporary Gmail addresses...');
    for (const [index, item] of plan.entries()) {
      await setTemporaryAuthEmail(item, index);
    }
  }

  console.log('Applying final profile/auth data...');
  for (const [index, item] of plan.entries()) {
    await updateProfile(item);
    if (syncAuth) await updateAuthUser(item);
    console.log(`[${index + 1}/${plan.length}] ${item.fake.email}`);
  }

  console.log('Done.');
}

main().catch((error) => {
  console.error('Failed:', error.message || error);
  process.exit(1);
});
