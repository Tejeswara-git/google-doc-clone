import db from '@/lib/db';

export async function GET() {
  try {
    const stmt = db.prepare('SELECT id, name FROM users');
    const users = await stmt.all();
    return new Response(JSON.stringify(users), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch users' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
