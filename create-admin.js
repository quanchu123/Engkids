/**
 * 🔐 CREATE ADMIN USER
 * Tạo tài khoản admin trong Supabase Auth
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createAdmin() {
  console.log('\n🔐 CREATING ADMIN USER\n');
  console.log('='.repeat(60));
  
  const adminEmail = 'admin@comiclingua.com';
  const adminPassword = 'chinh123';
  const adminName = 'Super Admin';

  try {
    // Step 1: Check if user already exists
    console.log('\n📋 Step 1: Checking if admin exists...');
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error listing users:', listError.message);
      process.exit(1);
    }

    const existingAdmin = existingUsers.users.find(u => u.email === adminEmail);
    
    if (existingAdmin) {
      console.log(`✅ Admin user already exists!`);
      console.log(`   ID: ${existingAdmin.id}`);
      console.log(`   Email: ${existingAdmin.email}`);
      
      // Check if profile exists
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('auth_id', existingAdmin.id)
        .single();
      
      if (profile) {
        console.log(`   Profile exists: ${profile.id}`);
      } else {
        console.log(`   ⚠️  Creating profile...`);
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            auth_id: existingAdmin.id,
            email: adminEmail,
            name: adminName,
            account_type: 'premium'
          });
        
        if (profileError) {
          console.log(`   ⚠️  Profile error: ${profileError.message}`);
        } else {
          console.log(`   ✅ Profile created!`);
        }
      }
    } else {
      // Step 2: Create admin user
      console.log('\n📝 Step 2: Creating admin user...');
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          name: adminName
        }
      });

      if (createError) {
        console.error('❌ Error creating user:', createError.message);
        process.exit(1);
      }

      console.log('✅ Admin user created!');
      console.log(`   ID: ${newUser.user.id}`);
      console.log(`   Email: ${newUser.user.email}`);

      // Step 3: Create user profile
      console.log('\n👤 Step 3: Creating user profile...');
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          auth_id: newUser.user.id,
          email: adminEmail,
          name: adminName,
          account_type: 'premium' // Give admin premium account
        });

      if (profileError) {
        console.log(`⚠️  Profile creation warning: ${profileError.message}`);
        console.log('   (This might be ok if trigger already created it)');
      } else {
        console.log('✅ Profile created!');
      }

      // Step 4: Create user progress
      console.log('\n📊 Step 4: Creating user progress...');
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('auth_id', newUser.user.id)
        .single();

      if (profile) {
        const { error: progressError } = await supabase
          .from('user_progress')
          .insert({
            user_profile_id: profile.id,
            total_stars: 0,
            current_streak: 0
          });

        if (progressError) {
          console.log(`⚠️  Progress warning: ${progressError.message}`);
        } else {
          console.log('✅ Progress record created!');
        }
      }
    }

    // Step 5: Test login
    console.log('\n🔑 Step 5: Testing login...');
    const anonClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    
    const { data: loginData, error: loginError } = await anonClient.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword
    });

    if (loginError) {
      console.error('❌ Login test failed:', loginError.message);
      
      if (loginError.message.includes('Email not confirmed')) {
        console.log('\n⚠️  Email needs confirmation. Let me fix that...');
        
        // Get user and update email_confirmed_at
        const { data: users } = await supabase.auth.admin.listUsers();
        const user = users.users.find(u => u.email === adminEmail);
        
        if (user) {
          await supabase.auth.admin.updateUserById(user.id, {
            email_confirm: true
          });
          console.log('✅ Email confirmed! Try logging in again.');
        }
      }
      
      process.exit(1);
    }

    console.log('✅ Login successful!');
    console.log(`   Access Token: ${loginData.session.access_token.substring(0, 20)}...`);
    console.log(`   User ID: ${loginData.user.id}`);

    // Step 6: Verify admin access
    console.log('\n👨‍💼 Step 6: Verifying admin access...');
    const adminEmails = ['admin@comiclingua.com', 'chinh@example.com'];
    
    if (adminEmails.includes(adminEmail)) {
      console.log('✅ Email is in ADMIN_EMAILS list → Will redirect to /admin');
    } else {
      console.log('⚠️  Email NOT in ADMIN_EMAILS list → Will redirect to /progress');
      console.log('   Add your email to src/components/AdminGuard.tsx');
    }

    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('\n🎉 ADMIN SETUP COMPLETE!\n');
    console.log('📧 Email:    ' + adminEmail);
    console.log('🔑 Password: ' + adminPassword);
    console.log('\n🚀 Login at: http://localhost:3001/login\n');
    console.log('After login, you will be redirected to: /admin\n');

  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
    process.exit(1);
  }
}

createAdmin();
