import db from '@/lib/db';

export async function GET(request) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    // Get documents owned by the user
    const ownedStmt = db.prepare('SELECT * FROM documents WHERE owner_id = ? ORDER BY updated_at DESC');
    const owned = await ownedStmt.all(userId);

    // Get documents shared with the user
    const sharedStmt = db.prepare(`
      SELECT d.* FROM documents d
      JOIN document_shares ds ON d.id = ds.document_id
      WHERE ds.user_id = ? ORDER BY d.updated_at DESC
    `);
    const shared = await sharedStmt.all(userId);

    return new Response(JSON.stringify({ owned, shared }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch documents' }), { status: 500 });
  }
}

export async function POST(request) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const { title, content } = await request.json();
    const stmt = db.prepare('INSERT INTO documents (title, content, owner_id) VALUES (?, ?, ?)');
    const info = await stmt.run(title || 'Untitled Document', content || '', userId);

    return new Response(JSON.stringify({ id: info.lastInsertRowid }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to create document' }), { status: 500 });
  }
}
