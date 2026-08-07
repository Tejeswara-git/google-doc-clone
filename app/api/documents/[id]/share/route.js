import db from '@/lib/db';

export async function POST(request, { params }) {
  const userId = request.headers.get('x-user-id');
  const { id } = await params;
  
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const { userIdToShare } = await request.json();

    // Check if the current user is the owner
    const checkStmt = db.prepare('SELECT id FROM documents WHERE id = ? AND owner_id = ?');
    const isOwner = checkStmt.get(id, userId);

    if (!isOwner) {
      return new Response(JSON.stringify({ error: 'Only the owner can share this document' }), { status: 403 });
    }

    // Insert share record (ignore if already shared)
    const shareStmt = db.prepare('INSERT OR IGNORE INTO document_shares (document_id, user_id) VALUES (?, ?)');
    shareStmt.run(id, userIdToShare);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to share document' }), { status: 500 });
  }
}
