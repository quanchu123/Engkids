import { NextResponse } from 'next/server';
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get('secret');

    // Simple security check
    if (secret !== 'nhom4exe201') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUrl = process.env.SUPABASE_DB_URL;
    if (!dbUrl) {
      return NextResponse.json({ error: 'SUPABASE_DB_URL is not set on the server' }, { status: 500 });
    }

    const client = new Client({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();

    const m27Path = path.join(process.cwd(), 'supabase', 'migrations', '027_add_subscriptions.sql');
    const m28Path = path.join(process.cwd(), 'supabase', 'migrations', '028_update_account_type_admin.sql');

    const sql27 = fs.readFileSync(m27Path, 'utf8');
    const sql28 = fs.readFileSync(m28Path, 'utf8');

    const logs: string[] = [];

    logs.push('Executing 027_add_subscriptions...');
    await client.query(sql27);
    logs.push('Successfully executed 027_add_subscriptions');

    logs.push('Executing 028_update_account_type_admin...');
    await client.query(sql28);
    logs.push('Successfully executed 028_update_account_type_admin');

    await client.end();

    return NextResponse.json({ success: true, logs });
  } catch (error: unknown) {
    console.error('Run Migration Error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message, success: false }, { status: 500 });
  }
}
