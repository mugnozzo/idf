const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const projectRoot = __dirname;
const dbDir = path.join(projectRoot, 'database');
const dbPath = path.join(dbDir, 'app.sqlite');
const schemaPath = path.join(dbDir, 'schema-and-basic-data.sql');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function createAndSeedDatabase() {
  ensureDir(dbDir);

  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema file not found: ${schemaPath}`);
  }

  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  const db = new Database(dbPath);

  try {
    db.pragma('foreign_keys = ON');
    db.pragma('journal_mode = WAL');
    db.exec(schemaSql);

    const tables = db.prepare(`
      SELECT name
      FROM sqlite_master
      WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name ASC
    `).all();

    console.log(`Database created and seeded successfully: ${dbPath}`);
    console.log(`Tables: ${tables.map((t) => t.name).join(', ')}`);
  } finally {
    db.close();
  }
}

try {
  createAndSeedDatabase();
} catch (error) {
  console.error('Failed to create/seed database:', error.message);
  process.exit(1);
}
