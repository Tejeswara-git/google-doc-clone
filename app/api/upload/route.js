import db from '@/lib/db';

export async function POST(request) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), { status: 400 });
    }

    // Basic validation for txt/md
    const filename = file.name || '';
    if (!filename.endsWith('.txt') && !filename.endsWith('.md')) {
      return new Response(JSON.stringify({ error: 'Only .txt and .md files are supported' }), { status: 400 });
    }

    const text = await file.text();
    // Use the filename as the title (stripping extension)
    const title = filename.replace(/\.(txt|md)$/i, '');

    const stmt = db.prepare('INSERT INTO documents (title, content, owner_id) VALUES (?, ?, ?)');
    // Wrap plain text in a paragraph so TipTap parses it correctly
    const content = `<p>${text.replace(/\n/g, '<br/>')}</p>`;
    const info = await stmt.run(title, content, userId);

    return new Response(JSON.stringify({ id: info.lastInsertRowid }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to process file upload' }), { status: 500 });
  }
}
