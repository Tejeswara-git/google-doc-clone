import db from '@/lib/db';

export async function GET(request, { params }) {
  const userId = request.headers.get('x-user-id');
  const { id } = await params;
  
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const stmt = db.prepare(`
      SELECT d.* FROM documents d
      LEFT JOIN document_shares ds ON d.id = ds.document_id
      WHERE d.id = ? AND (d.owner_id = ? OR ds.user_id = ?)
    `);
    const document = stmt.get(id, userId, userId);

    if (!document) {
      return new Response(JSON.stringify({ error: 'Document not found or access denied' }), { status: 404 });
    }

    return new Response(JSON.stringify(document), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch document' }), { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const userId = request.headers.get('x-user-id');
  const { id } = await params;
  
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    // Check access
    const checkStmt = db.prepare(`
      SELECT d.id FROM documents d
      LEFT JOIN document_shares ds ON d.id = ds.document_id
      WHERE d.id = ? AND (d.owner_id = ? OR ds.user_id = ?)
    `);
    const hasAccess = checkStmt.get(id, userId, userId);

    if (!hasAccess) {
      return new Response(JSON.stringify({ error: 'Document not found or access denied' }), { status: 404 });
    }

    const { title, content } = await request.json();
    
    let query = 'UPDATE documents SET updated_at = CURRENT_TIMESTAMP';
    const queryParams = [];
    
    if (title !== undefined) {
      query += ', title = ?';
      queryParams.push(title);
    }
    if (content !== undefined) {
      query += ', content = ?';
      queryParams.push(content);
    }
    
    query += ' WHERE id = ?';
    queryParams.push(id);

    const updateStmt = db.prepare(query);
    updateStmt.run(...queryParams);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to update document' }), { status: 500 });
  }
}
