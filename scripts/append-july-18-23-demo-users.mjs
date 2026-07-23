import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local', quiet: true });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');

if (!supabaseUrl || !serviceKey || !anonKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const publicAuth = createClient(supabaseUrl, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
let createAuthMode = 'admin';

const protectedEmails = new Set(['admin@comiclingua.com', 'viet@ultra.com']);
const targetMinByDate = 2;
const premiumAmount = 39000;
const premiumPlanId = '1_month';

const familyNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Ngô', 'Dương', 'Lý', 'Đinh', 'Lâm'];
const parentMale = ['Việt', 'Hùng', 'Tuấn', 'Đức', 'Hải', 'Sơn', 'Hoàng', 'Khánh', 'Nam', 'Huy', 'Đạt', 'Long', 'Cường', 'Thắng'];
const parentFemale = ['Thảo', 'Mai', 'Trang', 'Hằng', 'Linh', 'Hoa', 'Nhung', 'Huyền', 'Chi', 'Phương', 'Nga', 'Lan', 'Vân'];
const childMale = ['Kiên', 'Minh', 'Bảo', 'Khang', 'Long', 'Quân', 'Huy', 'Nam', 'Duy', 'Phúc', 'An'];
const childFemale = ['An', 'Linh', 'Nhi', 'Hân', 'My', 'Chi', 'Thảo', 'Anh', 'Trang', 'Ngọc', 'Vy'];
const maleMiddle = ['Văn', 'Quốc', 'Minh', 'Anh', 'Thanh', 'Đức', 'Gia', 'Tuấn', 'Hoàng', 'Tiến', 'Duy'];
const femaleMiddle = ['Thị', 'Thu', 'Ngọc', 'Bảo', 'Khánh', 'Minh', 'Gia', 'Thanh', 'Phương', 'Mai'];
const childMaleMiddle = ['Trung', 'Minh', 'Gia', 'Đức', 'Quốc', 'Anh', 'Bảo', 'Duy'];
const childFemaleMiddle = ['Bảo', 'Ngọc', 'Khánh', 'Minh', 'Thu', 'Gia', 'Phương'];
const addresses = [
  'Thạch Thất, Hà Nội',
  'Hòa Lạc, Thạch Thất',
  'Sơn Tây, Hà Nội',
  'TX Sơn Tây',
  'Phường Trung Hưng, Sơn Tây',
  'Xã Hòa Lạc - Hà Nội',
  'Thạch Thất - Hà Nội',
  'son tay ha noi',
  'Khu công nghệ cao Hòa Lạc, Hà Nội',
];

const dateTargets = [
  { date: '2026-07-18', premiumToAdd: 2 },
  { date: '2026-07-19', premiumToAdd: 0 },
  { date: '2026-07-20', premiumToAdd: 0 },
  { date: '2026-07-21', premiumToAdd: 0 },
  { date: '2026-07-22', premiumToAdd: 0 },
  { date: '2026-07-23', premiumToAdd: 1 },
];

const timeSlotsByDate = {
  '2026-07-18': [
    { created: [8, 32], paid: [20, 18] },
    { created: [15, 46], paid: [21, 7] },
  ],
  '2026-07-19': [
    { created: [9, 11] },
    { created: [20, 36] },
  ],
  '2026-07-20': [
    { created: [7, 48] },
  ],
  '2026-07-22': [
    { created: [19, 24] },
  ],
  '2026-07-23': [
    { created: [10, 18], paid: [19, 42] },
  ],
};

function pick(list, index, salt = 0) {
  return list[(index + salt) % list.length];
}

function toEmailToken(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function gmailUniquenessKey(email) {
  const [local = '', domain = ''] = String(email).toLowerCase().split('@');
  return domain === 'gmail.com' ? `${domain}:${local.replace(/\./g, '')}` : `${domain}:${local}`;
}

function rememberEmail(email, usedEmails) {
  const normalized = String(email).toLowerCase();
  usedEmails.add(normalized);
  usedEmails.add(gmailUniquenessKey(normalized));
}

function hasUsedEmail(email, usedEmails) {
  const normalized = String(email).toLowerCase();
  return usedEmails.has(normalized) || usedEmails.has(gmailUniquenessKey(normalized));
}

function makeUniqueEmail(bases, usedEmails) {
  for (const base of bases) {
    const email = `${base}@gmail.com`;
    if (!hasUsedEmail(email, usedEmails)) {
      rememberEmail(email, usedEmails);
      return email;
    }
  }

  for (let suffix = 24; suffix < 10000; suffix += 1) {
    const email = `${bases[0]}${suffix}@gmail.com`;
    if (!hasUsedEmail(email, usedEmails)) {
      rememberEmail(email, usedEmails);
      return email;
    }
  }

  throw new Error(`Could not create unique email from ${bases[0]}`);
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

function toUtcIsoFromVietnamTime(dateKey, hour, minute, second = 0) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour - 7, minute, second)).toISOString();
}

function getVietnamDateKey(value) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
}

function makePassword() {
  return `Engkids@${crypto.randomBytes(5).toString('hex')}A1`;
}

function makeOrderCode(index) {
  const base = Number(String(Date.now()).slice(-9)) * 1000;
  return String(base + 700 + index);
}

function addOneMonth(value) {
  const date = new Date(value);
  date.setMonth(date.getMonth() + 1);
  return date.toISOString();
}

function makePerson(index, usedEmails, createdAt, options = {}) {
  const parentGender = index % 4 === 0 ? 'female' : 'male';
  const childGender = index % 3 === 0 ? 'female' : 'male';
  const familyName = pick(familyNames, index, 1);
  const parentGiven = pick(parentGender === 'female' ? parentFemale : parentMale, index, 3);
  const parentMiddle = pick(parentGender === 'female' ? femaleMiddle : maleMiddle, index, 5);
  const childGiven = pick(childGender === 'female' ? childFemale : childMale, index, 7);
  const childMiddle = pick(childGender === 'female' ? childFemaleMiddle : childMaleMiddle, index, 2);
  const parentBirthYear = pick([1995, 1992, 1990, 1989, 1994, 1991, 1988, 1987, 1996, 1993], index);
  const childAge = pick([5, 6, 7, 8, 5, 6, 7, 8, 4], index);
  const givenToken = toEmailToken(parentGiven);
  const familyToken = toEmailToken(familyName);
  const middleToken = toEmailToken(parentMiddle);
  const yy = String(parentBirthYear).slice(2);
  const variants = [
    `${givenToken}${familyToken}`,
    `${familyToken}${givenToken}${yy}`,
    `${givenToken}.${familyToken}`,
    `${familyToken}${middleToken}${givenToken}`,
    `${givenToken}${familyToken}123`,
    `${givenToken}${familyToken}88`,
    `${familyToken}.${givenToken}${parentBirthYear}`,
  ];

  return {
    email: makeUniqueEmail(variants, usedEmails),
    name: `${familyName} ${childMiddle} ${childGiven}`,
    parent_name: `${familyName} ${parentMiddle} ${parentGiven}`,
    child_age: childAge,
    parent_age: 2026 - parentBirthYear,
    gender: childGender,
    address: pick(addresses, index, options.isPremium ? 3 : 0),
    created_at: createdAt,
    updated_at: new Date(new Date(createdAt).getTime() + (34 + (index * 19) % 180) * 60 * 1000).toISOString(),
    account_type: options.isPremium ? 'premium' : 'free',
    is_premium: Boolean(options.isPremium),
    premium_until: options.paidAt ? addOneMonth(options.paidAt) : null,
  };
}

async function fetchProfiles() {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: true })
      .range(from, from + 999);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

function profilePayloadForFake(authId, fake, columns) {
  const payload = {
    auth_id: authId,
    email: fake.email,
    name: fake.name,
    parent_name: fake.parent_name,
    child_age: fake.child_age,
    parent_age: fake.parent_age,
    gender: fake.gender,
    address: fake.address,
    role: 'user',
    account_type: fake.account_type,
    is_premium: fake.is_premium,
    premium_until: fake.premium_until,
    created_at: fake.created_at,
    updated_at: fake.updated_at,
  };

  return Object.fromEntries(Object.entries(payload).filter(([key]) => columns.includes(key)));
}

function buildPlan(profiles) {
  const protectedRows = profiles.filter(isProtectedProfile);
  const normalRows = profiles.filter((profile) => !isProtectedProfile(profile));
  const columns = profiles[0] ? Object.keys(profiles[0]) : [];
  const usedEmails = new Set();
  for (const profile of profiles) {
    if (profile.email) rememberEmail(profile.email, usedEmails);
  }

  const existingByDate = new Map();
  for (const profile of normalRows) {
    const dateKey = getVietnamDateKey(profile.created_at);
    existingByDate.set(dateKey, (existingByDate.get(dateKey) || 0) + 1);
  }

  const plan = [];
  for (const target of dateTargets) {
    const existing = existingByDate.get(target.date) || 0;
    const totalToAdd = Math.max(0, targetMinByDate - existing, target.premiumToAdd);
    const slots = timeSlotsByDate[target.date] || [];

    for (let index = 0; index < totalToAdd; index += 1) {
      const isPremium = index < target.premiumToAdd;
      const slot = slots[index] || { created: [8 + (index * 4), 17 + (index * 11) % 43] };
      const createdAt = toUtcIsoFromVietnamTime(target.date, slot.created[0], slot.created[1], 9 + index * 13);
      const paidAt = isPremium
        ? toUtcIsoFromVietnamTime(target.date, slot.paid?.[0] ?? (slot.created[0] + 3), slot.paid?.[1] ?? ((slot.created[1] + 19) % 60), 22 + index * 7)
        : null;
      const fake = makePerson(normalRows.length + plan.length, usedEmails, createdAt, { isPremium, paidAt });

      plan.push({
        date: target.date,
        sequence: existing + index + 1,
        auth_id: null,
        password: null,
        isPremium,
        fake,
        transaction: isPremium
          ? {
              order_code: makeOrderCode(plan.length),
              amount: premiumAmount,
              plan_id: premiumPlanId,
              status: 'PAID',
              created_at: new Date(new Date(paidAt).getTime() - (18 + index * 9) * 60 * 1000).toISOString(),
              paid_at: paidAt,
            }
          : null,
      });
    }
  }

  return { plan, protectedRows, normalRows, existingByDate, columns };
}

async function createUser(item, columns) {
  const password = makePassword();
  const metadata = {
    name: item.fake.name,
    display_name: item.fake.name,
    parent_name: item.fake.parent_name,
    child_age: String(item.fake.child_age),
    parent_age: String(item.fake.parent_age),
    gender: item.fake.gender,
    address: item.fake.address,
  };
  let authUser = null;
  let authMethod = createAuthMode;

  if (createAuthMode === 'admin') {
    const { data, error } = await admin.auth.admin.createUser({
      email: item.fake.email,
      password,
      email_confirm: true,
      user_metadata: metadata,
    });

    if (!error) {
      authUser = data.user;
    } else if (/invalid JWT|unrecognized JWT kid|unable to parse or verify signature/i.test(error.message || '')) {
      createAuthMode = 'signup';
      authMethod = 'signup';
    } else {
      throw error;
    }
  }

  if (!authUser) {
    const { data, error } = await publicAuth.auth.signUp({
      email: item.fake.email,
      password,
      options: {
        data: metadata,
      },
    });
    if (error) throw error;
    if (!data.user) throw new Error(`Signup did not return a user for ${item.fake.email}`);
    authUser = data.user;
    authMethod = 'signup';
  }

  try {
    const { error: profileError } = await admin
      .from('user_profiles')
      .upsert(profilePayloadForFake(authUser.id, item.fake, columns), { onConflict: 'auth_id' });
    if (profileError) throw profileError;

    item.auth_id = authUser.id;
    item.password = password;
    item.auth_method = authMethod;

    if (item.transaction) {
      const { error: transactionError } = await admin
        .from('transactions')
        .insert({
          user_id: authUser.id,
          ...item.transaction,
        });
      if (transactionError) throw transactionError;
    }
  } catch (error) {
    if (authMethod === 'admin') {
      await admin.auth.admin.deleteUser(authUser.id).catch(() => {});
    }
    throw error;
  }

  return { auth_id: authUser.id, email: item.fake.email, password, auth_method: authMethod };
}

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function writeOutputs(context, createdUsers) {
  const outDir = path.join(process.cwd(), 'output');
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const planPath = path.join(outDir, `demo-registrations-append-2026-07-18-23-${stamp}.json`);
  const authSqlPath = path.join(outDir, `demo-auth-users-append-2026-07-18-23-created-at-update-${stamp}.sql`);

  fs.writeFileSync(
    planPath,
    JSON.stringify({
      created_at: new Date().toISOString(),
      apply,
      mode: 'append-july-18-23',
      targetMinByDate,
      premiumAmount,
      premiumPlanId,
      createdUsers,
      rows: context.plan,
    }, null, 2),
  );

  fs.writeFileSync(
    authSqlPath,
    [
      '-- Optional: run in Supabase SQL Editor if auth.users timestamps must match user_profiles.',
      'begin;',
      ...context.plan
        .filter((item) => item.auth_id)
        .map((item) => `update auth.users set created_at = ${sqlString(item.fake.created_at)}, updated_at = ${sqlString(item.fake.updated_at)} where id = ${sqlString(item.auth_id)};`),
      'commit;',
      '',
    ].join('\n'),
  );

  return { planPath, authSqlPath };
}

function printPreview(context) {
  console.log('Mode: append 2026-07-18/23 missing demo users');
  console.log(`Protected/admin rows: ${context.protectedRows.length}`);
  console.log(`Current normal users: ${context.normalRows.length}`);
  console.log(`Will create users: ${context.plan.length}`);
  console.log(`Will create paid 39k users: ${context.plan.filter((item) => item.isPremium).length}`);
  console.log(`Mode: ${apply ? 'APPLY' : 'DRY RUN'}`);
  console.log('');

  for (const target of dateTargets) {
    const existing = context.existingByDate.get(target.date) || 0;
    const planned = context.plan.filter((item) => item.date === target.date).length;
    const paid = context.plan.filter((item) => item.date === target.date && item.isPremium).length;
    console.log(`${target.date}: existing=${existing}, create=${planned}, paid=${paid}, final=${existing + planned}`);
  }

  console.log('');
  for (const item of context.plan) {
    const createdVn = new Date(item.fake.created_at).toLocaleString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false });
    const paidVn = item.transaction?.paid_at
      ? new Date(item.transaction.paid_at).toLocaleString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false })
      : '';
    console.log(`${item.fake.email} ${item.isPremium ? 'PAID 39k' : 'free'}`);
    console.log(`  date=${item.date} created_at_vn=${createdVn}${paidVn ? ` paid_at_vn=${paidVn}` : ''}`);
    console.log(`  parent=${item.fake.parent_name} child=${item.fake.name} (${item.fake.child_age}) address=${item.fake.address}`);
  }
}

async function main() {
  const profiles = await fetchProfiles();
  const context = buildPlan(profiles);
  printPreview(context);

  const createdUsers = [];
  if (apply) {
    console.log('');
    console.log('Creating users...');
    for (const [index, item] of context.plan.entries()) {
      const created = await createUser(item, context.columns);
      createdUsers.push(created);
      console.log(`[${index + 1}/${context.plan.length}] ${created.email}${item.isPremium ? ' paid' : ''}`);
    }
  }

  const { planPath, authSqlPath } = writeOutputs(context, createdUsers);
  console.log('');
  console.log(`Plan written: ${planPath}`);
  console.log(`Optional auth timestamp SQL written: ${authSqlPath}`);
  if (!apply) console.log('Dry run only. Add --apply to create users.');
  else console.log('Done.');
}

main().catch((error) => {
  console.error('Failed:', error.message || error);
  process.exit(1);
});
