const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper function to remove accents and return clean string
function removeAccents(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

// Convert parent's name to realistic email based on birth year
function nameToEmail(fullName, age, domain) {
  const cleanName = removeAccents(fullName.toLowerCase());
  const parts = cleanName.split(' ');
  const lastName = parts[parts.length - 1];
  const firstParts = parts.slice(0, parts.length - 1).join('');
  const birthYear = 2026 - age;
  return `${lastName}.${firstParts}.${birthYear}@${domain}`;
}

// Generate a completely random secure password
function generateSecurePassword() {
  const length = 12 + Math.floor(Math.random() * 4); // 12-15 chars
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  const special = '!@#$%^&*';
  const all = lower + upper + digits + special;
  
  let password = '';
  password += lower.charAt(Math.floor(Math.random() * lower.length));
  password += upper.charAt(Math.floor(Math.random() * upper.length));
  password += digits.charAt(Math.floor(Math.random() * digits.length));
  password += special.charAt(Math.floor(Math.random() * special.length));
  
  for (let i = 4; i < length; i++) {
    password += all.charAt(Math.floor(Math.random() * all.length));
  }
  
  // Shuffle password
  return password.split('').sort(() => 0.5 - Math.random()).join('');
}

// Helper to deduce gender from Vietnamese child name
function getGender(name) {
  const femaleKeywords = ['thi', 'hoa', 'thao', 'hang', 'chi', 'ngoc', 'ly', 'han', 'linh', 'mai', 'nhung', 'trang'];
  const cleanName = removeAccents(name.toLowerCase());
  for (const kw of femaleKeywords) {
    if (cleanName.includes(kw)) {
      return 'female';
    }
  }
  return 'male';
}

// Helper to generate birth date based on age
function getBirthDate(childAge) {
  const birthYear = 2026 - childAge;
  const month = 1 + Math.floor(Math.random() * 12);
  const day = 1 + Math.floor(Math.random() * 28);
  const monthStr = month < 10 ? `0${month}` : `${month}`;
  const dayStr = day < 10 ? `0${day}` : `${day}`;
  return `${birthYear}-${monthStr}-${dayStr}`;
}

// Vietnamese addresses list (Hanoi-centric, strictly Son Tay & Thach That)
const addresses = [
  'Sơn Tây, Hà Nội',
  'Thạch Thất, Hà Nội',
  'TX. Sơn Tây, Hà Nội',
  'H. Thạch Thất, Hà Nội',
  'Phường Ngô Quyền, Sơn Tây, Hà Nội',
  'Xã Bình Yên, Thạch Thất, Hà Nội',
  'Phường Quang Trung, Sơn Tây, Hà Nội',
  'Xã Liên Quan, Thạch Thất, Hà Nội',
  'Phường Lê Lợi, Sơn Tây, Hà Nội',
  'Xã Kim Quan, Thạch Thất, Hà Nội',
  'Phường Sơn Lộc, Sơn Tây, Hà Nội',
  'Xã Phùng Xá, Thạch Thất, Hà Nội',
  'Phường Trung Hưng, Sơn Tây, Hà Nội',
  'Xã Chàng Sơn, Thạch Thất, Hà Nội',
  'Phường Viên Sơn, Sơn Tây, Hà Nội',
  'Xã Canh Nậu, Thạch Thất, Hà Nội',
  'Phường Trung Sơn Trầm, Sơn Tây, Hà Nội',
  'Xã Hữu Bằng, Thạch Thất, Hà Nội',
  'Xã Đường Lâm, Sơn Tây, Hà Nội',
  'Xã Thạch Hòa, Thạch Thất, Hà Nội'
];

// 35 Pairs of Child and Parent names
const userPairs = [
  { child: 'Nguyễn Văn Nam', parent: 'Nguyễn Văn Hùng' },
  { child: 'Trần Thị Hoa', parent: 'Trần Quốc Anh' },
  { child: 'Lê Hoàng Bách', parent: 'Lê Văn Hải' },
  { child: 'Phạm Minh Tuấn', parent: 'Phạm Thanh Sơn' },
  { child: 'Hoàng Thu Thảo', parent: 'Hoàng Minh Đức' },
  { child: 'Huỳnh Minh Triết', parent: 'Huỳnh Anh Tuấn' },
  { child: 'Phan Thanh Hằng', parent: 'Phan Văn Hoàng' },
  { child: 'Vũ Hoàng Long', parent: 'Vũ Minh Tiến' },
  { child: 'Võ Thị Kim Chi', parent: 'Võ Văn Nam' },
  { child: 'Đặng Anh Tuấn', parent: 'Đặng Quốc Khánh' },
  { child: 'Bùi Minh Quân', parent: 'Bùi Hồng Sơn' },
  { child: 'Đỗ Hồng Ngọc', parent: 'Đỗ Minh Quân' },
  { child: 'Ngô Tiến Đạt', parent: 'Ngô Văn Hùng' },
  { child: 'Dương Khánh Ly', parent: 'Dương Minh Hoàng' },
  { child: 'Lý Gia Bảo', parent: 'Lý Văn Tuấn' },
  { child: 'Đinh Hoài Nam', parent: 'Đinh Văn Hải' },
  { child: 'Lâm Gia Hân', parent: 'Lâm Quốc Tuấn' },
  { child: 'Đoàn Văn Hậu', parent: 'Đoàn Văn Hùng' },
  { child: 'Mai Phương Thảo', parent: 'Mai Văn Sơn' },
  { child: 'Trịnh Công Sơn', parent: 'Trịnh Văn Hải' },
  { child: 'Đào Minh Khang', parent: 'Đào Quốc Hưng' },
  { child: 'Phùng Khánh Linh', parent: 'Phùng Văn Hùng' },
  { child: 'Lương Gia Huy', parent: 'Lương Minh Tuấn' },
  { child: 'Đỗ Cao Kỳ', parent: 'Đỗ Văn Nam' },
  { child: 'Nguyễn Thị Mai', parent: 'Nguyễn Văn Dũng' },
  { child: 'Trần Minh Triết', parent: 'Trần Văn Hùng' },
  { child: 'Lê Hồng Nhung', parent: 'Lê Quốc Huy' },
  { child: 'Phạm Thanh Sơn', parent: 'Phạm Văn Hải' },
  { child: 'Vũ Thu Trang', parent: 'Vũ Anh Tuấn' },
  { child: 'Đặng Văn Lâm', parent: 'Đặng Quốc Anh' },
  { child: 'Bùi Tiến Dũng', parent: 'Bùi Văn Hùng' },
  { child: 'Hồ Tuấn Tài', parent: 'Hồ Minh Tuấn' },
  { child: 'Nguyễn Công Phượng', parent: 'Nguyễn Văn Sơn' },
  { child: 'Phan Văn Đức', parent: 'Phan Văn Hải' },
  { child: 'Đỗ Duy Mạnh', parent: 'Đỗ Văn Hùng' }
];

const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'fpt.edu.vn'];
const daysAgoOptions = [30, 20, 10, 5];

async function run() {
  console.log(`🚀 Starting creation of ${userPairs.length} free users in database...`);
  
  const createdUsers = [];
  const passwordBackup = [];
  const sqlStatements = [];
  
  // Start the SQL file with disabling the trigger
  sqlStatements.push('ALTER TABLE public.user_profiles DISABLE TRIGGER user_profiles_updated_at;\n');
  
  for (let i = 0; i < userPairs.length; i++) {
    const pair = userPairs[i];
    const domain = domains[i % domains.length];
    
    // Parent age: 35 to 40
    const parentAge = 35 + (i % 6);
    // Child age: 5 to 12
    const childAge = 5 + (i % 8);
    
    const gender = getGender(pair.child);
    const birthDateStr = getBirthDate(childAge);
    const address = addresses[i % addresses.length];
    
    const email = nameToEmail(pair.parent, parentAge, domain);
    const password = generateSecurePassword();
    
    console.log(`[${i + 1}/${userPairs.length}] Creating auth user: ${pair.child} (Parent: ${pair.parent}, Gender: ${gender}, Birth Date: ${birthDateStr}, Address: ${address}, Email: ${email})...`);
    
    try {
      // 1. Create Auth User
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
          name: pair.child,
          parent_name: pair.parent,
          child_age: childAge,
          parent_age: parentAge,
          gender: gender,
          birth_date: birthDateStr,
          address: address
        }
      });
      
      if (authError) {
        console.error(`  ❌ Auth error for ${pair.child}:`, authError.message);
        continue;
      }
      
      const authId = authData.user.id;
      
      // 2. Create User Profile with all fields populated
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          auth_id: authId,
          email: email,
          name: pair.child,
          parent_name: pair.parent,
          child_age: childAge,
          parent_age: parentAge,
          gender: gender,
          birth_date: birthDateStr,
          address: address,
          account_type: 'free'
        });
        
      if (profileError) {
        console.error(`  ❌ Profile error for ${pair.child}:`, profileError.message);
        await supabase.auth.admin.deleteUser(authId);
        continue;
      }
      
      // Generate exact dates based on user requests: 30 days, 20 days, 10 days, 5 days ago
      const baseDays = daysAgoOptions[i % daysAgoOptions.length];
      const randomOffsetMs = Math.floor(Math.random() * 12 * 3600 * 1000) - (6 * 3600 * 1000);
      const createdDate = new Date(Date.now() - baseDays * 24 * 3600 * 1000 + randomOffsetMs);
      const updatedDate = new Date(createdDate.getTime() + (Math.random() * 24 * 3600 * 1000) + 12 * 3600 * 1000);
      
      console.log(`  ✅ Created! (${baseDays} days ago)`);
      
      createdUsers.push({
        'STT': i + 1,
        'Họ và Tên Bé': pair.child,
        'Tuổi Bé': childAge,
        'Giới tính': gender === 'female' ? 'Nữ' : 'Nam',
        'Ngày sinh': birthDateStr,
        'Họ và Tên Bố Mẹ': pair.parent,
        'Tuổi Bố Mẹ': parentAge,
        'Địa chỉ': address,
        'Email': email,
        'Loại tài khoản': 'free',
        'Ngày tạo nick': createdDate.toLocaleString('vi-VN')
      });
      
      // Generate SQL updates to run via MCP
      sqlStatements.push(`UPDATE auth.users SET created_at = '${createdDate.toISOString()}', updated_at = '${updatedDate.toISOString()}', last_sign_in_at = '${updatedDate.toISOString()}' WHERE id = '${authId}';`);
      sqlStatements.push(`UPDATE public.user_profiles SET created_at = '${createdDate.toISOString()}', updated_at = '${updatedDate.toISOString()}' WHERE auth_id = '${authId}';`);
      
      // Save password backup separately
      passwordBackup.push(`Họ và Tên Bé: ${pair.child}\nTuổi Bé: ${childAge}\nHọ và Tên Bố Mẹ: ${pair.parent}\nTuổi Bố Mẹ: ${parentAge}\nGiới tính: ${gender === 'female' ? 'Nữ' : 'Nam'}\nNgày sinh: ${birthDateStr}\nĐịa chỉ: ${address}\nEmail: ${email}\nMật khẩu: ${password}\nAuth ID: ${authId}\n${'='.repeat(40)}\n`);
    } catch (err) {
      console.error(`  ❌ System error for ${pair.child}:`, err.message);
    }
  }
  
  // Re-enable trigger
  sqlStatements.push('\nALTER TABLE public.user_profiles ENABLE TRIGGER user_profiles_updated_at;');
  
  console.log(`\n🎉 Created ${createdUsers.length}/${userPairs.length} users successfully!`);
  
  // 3. Write Excel file
  console.log('📊 Exporting to Excel file...');
  try {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(createdUsers);
    
    // Set column widths
    const max_len = [5, 25, 10, 12, 15, 25, 12, 35, 35, 15, 25];
    ws['!cols'] = max_len.map(w => ({ w }));
    
    XLSX.utils.book_append_sheet(wb, ws, 'Danh sách tài khoản');
    
    const outputPath = path.join(process.cwd(), 'danh_sach_tai_khoan.xlsx');
    XLSX.writeFile(wb, outputPath);
    
    console.log(`✅ Excel file generated successfully at: ${outputPath}`);
  } catch (excelErr) {
    console.error('❌ Excel export error:', excelErr.message);
  }
  
  // 4. Save local password backup
  const backupText = passwordBackup.join('\n');
  
  // Workspace root
  const rootBackupPath = path.join(process.cwd(), 'backup_mat_khau_35_acc.txt');
  fs.writeFileSync(rootBackupPath, backupText);
  console.log(`🔒 Backup passwords saved at workspace root: ${rootBackupPath}`);
  
  // Scratch directory
  const scratchDir = path.join('C:', 'Users', 'Chinhdz', '.gemini', 'antigravity', 'brain', '66cd80b8-64b6-46f5-bc06-962e882249ba', 'scratch');
  try {
    if (!fs.existsSync(scratchDir)) {
      fs.mkdirSync(scratchDir, { recursive: true });
    }
    const scratchBackupPath = path.join(scratchDir, 'backup_mat_khau_35_acc.txt');
    fs.writeFileSync(scratchBackupPath, backupText);
    console.log(`🔒 Backup passwords saved at scratch directory: ${scratchBackupPath}`);
  } catch (err) {
    console.error('⚠️ Could not save to scratch directory:', err.message);
  }
  
  // 5. Write the SQL updates file
  const sqlPath = path.join(process.cwd(), 'new_users_updates.sql');
  fs.writeFileSync(sqlPath, sqlStatements.join('\n'));
  console.log(`📝 Generated SQL updates file at: ${sqlPath}`);
}

run();
