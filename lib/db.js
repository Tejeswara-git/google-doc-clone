import Database from 'better-sqlite3';
import path from 'path';

// Define the path to the SQLite database
const dbPath = path.join(process.cwd(), 'data.db');
const db = new Database(dbPath, { verbose: console.log });

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT,
    owner_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(owner_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS document_shares (
    document_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    PRIMARY KEY(document_id, user_id),
    FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// Seed initial users if they don't exist
const stmt = db.prepare('SELECT COUNT(*) AS count FROM users');
const row = stmt.get();

if (row.count === 0) {
  const insertUser = db.prepare('INSERT INTO users (name) VALUES (?)');
  const insertTransaction = db.transaction(() => {
    insertUser.run('Alice');
    insertUser.run('Bob');
    insertUser.run('Charlie');
  });
  insertTransaction();
}

export default db;
