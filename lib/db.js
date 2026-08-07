import Database from 'better-sqlite3';
import { createClient } from '@libsql/client';
import path from 'path';

let db;

const isTurso = Boolean(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN);

if (isTurso) {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  // Ensure tables exist on Turso
  client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT
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
  `).then(async () => {
    try {
      await client.execute('ALTER TABLE users ADD COLUMN email TEXT');
    } catch (e) {
      // Column already exists
    }
    const res = await client.execute('SELECT COUNT(*) AS count FROM users');
    const count = Number(res.rows[0]?.count || 0);
    if (count === 0) {
      await client.execute("INSERT INTO users (name, email) VALUES ('Alice', 'alice@example.com')");
      await client.execute("INSERT INTO users (name, email) VALUES ('Bob', 'bob@example.com')");
      await client.execute("INSERT INTO users (name, email) VALUES ('Charlie', 'charlie@example.com')");
    } else {
      await client.execute("UPDATE users SET email = lower(name) || '@example.com' WHERE email IS NULL");
    }
  }).catch((err) => console.error('Turso init error:', err));

  db = {
    isTurso: true,
    prepare: (sql) => ({
      all: async (...args) => {
        const res = await client.execute({ sql, args });
        return res.rows;
      },
      get: async (...args) => {
        const res = await client.execute({ sql, args });
        return res.rows[0] || null;
      },
      run: async (...args) => {
        const res = await client.execute({ sql, args });
        return { lastInsertRowid: Number(res.lastInsertRowid), changes: res.rowsAffected };
      },
    }),
    exec: async (sql) => {
      await client.executeMultiple(sql);
    },
  };
} else {
  const dbPath = path.join(process.cwd(), 'data.db');
  const localDb = new Database(dbPath);

  localDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT
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

  try {
    localDb.exec('ALTER TABLE users ADD COLUMN email TEXT');
  } catch (e) {
    // Column already exists
  }
  localDb.exec("UPDATE users SET email = lower(name) || '@example.com' WHERE email IS NULL");

  const stmt = localDb.prepare('SELECT COUNT(*) AS count FROM users');
  const row = stmt.get();

  if (row.count === 0) {
    const insertUser = localDb.prepare('INSERT INTO users (name, email) VALUES (?, ?)');
    const insertTransaction = localDb.transaction(() => {
      insertUser.run('Alice', 'alice@example.com');
      insertUser.run('Bob', 'bob@example.com');
      insertUser.run('Charlie', 'charlie@example.com');
    });
    insertTransaction();
  }

  db = {
    isTurso: false,
    prepare: (sql) => ({
      all: async (...args) => localDb.prepare(sql).all(...args),
      get: async (...args) => localDb.prepare(sql).get(...args),
      run: async (...args) => localDb.prepare(sql).run(...args),
    }),
    exec: async (sql) => localDb.exec(sql),
  };
}

export default db;
