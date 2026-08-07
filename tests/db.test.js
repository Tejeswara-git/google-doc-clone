import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const TEST_DB_PATH = path.join(process.cwd(), 'test_data.db');

let db;

beforeAll(() => {
  // Clean up any previous test db
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }

  db = new Database(TEST_DB_PATH);

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

  // Seed users
  const insertUser = db.prepare('INSERT INTO users (name) VALUES (?)');
  insertUser.run('Alice');
  insertUser.run('Bob');
  insertUser.run('Charlie');
});

afterAll(() => {
  db.close();
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
});

describe('Database - Users', () => {
  it('should have 3 seeded users', () => {
    const users = db.prepare('SELECT * FROM users').all();
    expect(users).toHaveLength(3);
    expect(users.map((u) => u.name)).toEqual(['Alice', 'Bob', 'Charlie']);
  });
});

describe('Database - Documents', () => {
  it('should create a document', () => {
    const stmt = db.prepare(
      'INSERT INTO documents (title, content, owner_id) VALUES (?, ?, ?)'
    );
    const info = stmt.run('Test Doc', '<p>Hello</p>', 1);
    expect(info.lastInsertRowid).toBeGreaterThan(0);
  });

  it('should retrieve a document by id', () => {
    const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(1);
    expect(doc).toBeDefined();
    expect(doc.title).toBe('Test Doc');
    expect(doc.content).toBe('<p>Hello</p>');
    expect(doc.owner_id).toBe(1);
  });

  it('should update a document title', () => {
    db.prepare('UPDATE documents SET title = ? WHERE id = ?').run('Renamed Doc', 1);
    const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(1);
    expect(doc.title).toBe('Renamed Doc');
  });

  it('should list documents for an owner', () => {
    db.prepare(
      'INSERT INTO documents (title, content, owner_id) VALUES (?, ?, ?)'
    ).run('Second Doc', '', 1);

    const docs = db.prepare('SELECT * FROM documents WHERE owner_id = ?').all(1);
    expect(docs).toHaveLength(2);
  });
});

describe('Database - Sharing', () => {
  it('should share a document with another user', () => {
    const stmt = db.prepare(
      'INSERT OR IGNORE INTO document_shares (document_id, user_id) VALUES (?, ?)'
    );
    stmt.run(1, 2); // Share doc 1 with Bob
    const shares = db
      .prepare('SELECT * FROM document_shares WHERE document_id = ?')
      .all(1);
    expect(shares).toHaveLength(1);
    expect(shares[0].user_id).toBe(2);
  });

  it('should not duplicate a share', () => {
    const stmt = db.prepare(
      'INSERT OR IGNORE INTO document_shares (document_id, user_id) VALUES (?, ?)'
    );
    stmt.run(1, 2); // Try sharing again
    const shares = db
      .prepare('SELECT * FROM document_shares WHERE document_id = ?')
      .all(1);
    expect(shares).toHaveLength(1);
  });

  it('should list shared documents for a user', () => {
    const shared = db.prepare(`
      SELECT d.* FROM documents d
      JOIN document_shares ds ON d.id = ds.document_id
      WHERE ds.user_id = ?
    `).all(2);
    expect(shared).toHaveLength(1);
    expect(shared[0].title).toBe('Renamed Doc');
  });

  it('should verify access control - owner can access', () => {
    const doc = db.prepare(`
      SELECT d.* FROM documents d
      LEFT JOIN document_shares ds ON d.id = ds.document_id
      WHERE d.id = ? AND (d.owner_id = ? OR ds.user_id = ?)
    `).get(1, 1, 1);
    expect(doc).toBeDefined();
  });

  it('should verify access control - shared user can access', () => {
    const doc = db.prepare(`
      SELECT d.* FROM documents d
      LEFT JOIN document_shares ds ON d.id = ds.document_id
      WHERE d.id = ? AND (d.owner_id = ? OR ds.user_id = ?)
    `).get(1, 2, 2);
    expect(doc).toBeDefined();
  });

  it('should verify access control - unshared user cannot access', () => {
    const doc = db.prepare(`
      SELECT d.* FROM documents d
      LEFT JOIN document_shares ds ON d.id = ds.document_id
      WHERE d.id = ? AND (d.owner_id = ? OR ds.user_id = ?)
    `).get(1, 3, 3);
    expect(doc).toBeUndefined();
  });
});
