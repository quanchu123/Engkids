/**
 * Admin Authentication Service
 * Server-side only - uses bcrypt for password hashing and JWT for sessions
 */

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Server-side Supabase client with service role
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase credentials not configured');
  }
  
  return createClient(supabaseUrl, serviceRoleKey);
}

// Get JWT secret from environment
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET not configured');
  }
  return secret;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: 'admin' | 'super_admin';
}

export interface TokenPayload {
  sub: string;  // admin user id
  email: string;
  role: string;
  iat: number;
  exp: number;
}

/**
 * Create a new admin user (super_admin only)
 */
export async function createAdminUser(
  email: string,
  password: string,
  name?: string,
  role: 'admin' | 'super_admin' = 'admin'
): Promise<AdminUser> {
  const supabase = getSupabaseAdmin();
  
  // Hash password with bcrypt (cost factor 12)
  const passwordHash = await bcrypt.hash(password, 12);
  
  const { data, error } = await supabase
    .from('admin_users')
    .insert({
      email: email.toLowerCase().trim(),
      password_hash: passwordHash,
      name,
      role,
    })
    .select('id, email, name, role')
    .single();
  
  if (error) {
    if (error.code === '23505') {
      throw new Error('Email already exists');
    }
    throw new Error(`Failed to create admin: ${error.message}`);
  }
  
  return data;
}

/**
 * Authenticate admin user and return tokens
 */
export async function authenticateAdmin(
  email: string,
  password: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ accessToken: string; refreshToken: string; admin: AdminUser }> {
  const supabase = getSupabaseAdmin();
  
  // Find admin by email
  const { data: admin, error } = await supabase
    .from('admin_users')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .eq('is_active', true)
    .single();
  
  if (error || !admin) {
    throw new Error('Invalid email or password');
  }
  
  // Verify password
  const isValid = await bcrypt.compare(password, admin.password_hash);
  if (!isValid) {
    throw new Error('Invalid email or password');
  }
  
  // Generate tokens
  const jwtSecret = getJwtSecret();
  
  const accessToken = jwt.sign(
    {
      sub: admin.id,
      email: admin.email,
      role: admin.role,
    },
    jwtSecret,
    { expiresIn: '15m' }  // Short-lived access token
  );
  
  const refreshToken = jwt.sign(
    {
      sub: admin.id,
      type: 'refresh',
    },
    jwtSecret,
    { expiresIn: '7d' }  // Long-lived refresh token
  );
  
  // Store refresh token in database
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);  // 7 days
  await supabase.from('admin_sessions').insert({
    admin_id: admin.id,
    refresh_token: refreshToken,
    expires_at: expiresAt.toISOString(),
    ip_address: ipAddress,
    user_agent: userAgent,
  });
  
  // Update last login
  await supabase
    .from('admin_users')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', admin.id);
  
  return {
    accessToken,
    refreshToken,
    admin: {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    },
  };
}

/**
 * Verify access token and return payload
 */
export function verifyAccessToken(token: string): TokenPayload {
  const jwtSecret = getJwtSecret();
  
  try {
    const payload = jwt.verify(token, jwtSecret) as TokenPayload;
    return payload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<{ accessToken: string; admin: AdminUser }> {
  const supabase = getSupabaseAdmin();
  const jwtSecret = getJwtSecret();
  
  // Verify refresh token
  let payload: { sub: string; type: string };
  try {
    payload = jwt.verify(refreshToken, jwtSecret) as { sub: string; type: string };
    if (payload.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
  } catch {
    throw new Error('Invalid refresh token');
  }
  
  // Check if refresh token exists in database
  const { data: session, error } = await supabase
    .from('admin_sessions')
    .select('*, admin_users(*)')
    .eq('refresh_token', refreshToken)
    .gt('expires_at', new Date().toISOString())
    .single();
  
  if (error || !session) {
    throw new Error('Session expired or invalid');
  }
  
  const admin = session.admin_users;
  
  // Generate new access token
  const accessToken = jwt.sign(
    {
      sub: admin.id,
      email: admin.email,
      role: admin.role,
    },
    jwtSecret,
    { expiresIn: '15m' }
  );
  
  return {
    accessToken,
    admin: {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    },
  };
}

/**
 * Logout - invalidate refresh token
 */
export async function logoutAdmin(refreshToken: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  
  await supabase
    .from('admin_sessions')
    .delete()
    .eq('refresh_token', refreshToken);
}

/**
 * Get admin by ID
 */
export async function getAdminById(id: string): Promise<AdminUser | null> {
  const supabase = getSupabaseAdmin();
  
  const { data, error } = await supabase
    .from('admin_users')
    .select('id, email, name, role')
    .eq('id', id)
    .eq('is_active', true)
    .single();
  
  if (error || !data) return null;
  return data;
}

/**
 * Check if any admin exists (for initial setup)
 */
export async function hasAdminUsers(): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  
  const { count, error } = await supabase
    .from('admin_users')
    .select('*', { count: 'exact', head: true });
  
  return !error && (count ?? 0) > 0;
}
