const fs = require('fs');
const path = require('path');
const db = require('./db');

const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logFilePath = path.join(logsDir, 'app.log');

function safeStringify(value) {
  try {
    return JSON.stringify(value);
  } catch (error) {
    return JSON.stringify({ serializationError: error.message });
  }
}

function writeToDb({ level, method = null, route = null, message, meta = null, status_code = null }) {
  try {
    const stmt = db.prepare(`
      INSERT INTO logs (level, method, route, message, meta, status_code, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      level,
      method,
      route,
      message,
      meta ? safeStringify(meta) : null,
      status_code,
      Date.now()
    );
  } catch (error) {
    const fallbackLine = `[${new Date().toISOString()}] [ERROR] Failed to write log to DB: ${error.message}\n`;
    fs.appendFileSync(logFilePath, fallbackLine, 'utf8');
    console.error(fallbackLine.trim());
  }
}

function log(level, message, options = {}) {
  const timestamp = new Date().toISOString();
  const { method = null, route = null, meta = null, status_code = null } = options;

  const chunks = [timestamp, level.toUpperCase()];
  if (method) chunks.push(method);
  if (route) chunks.push(route);
  chunks.push(message);
  if (meta) chunks.push(safeStringify(meta));

  const line = `[${chunks.join('] [')}]\n`;

  fs.appendFileSync(logFilePath, line, 'utf8');

  if (level === 'error' || level === 'warn') {
    console.error(line.trim());
  } else {
    console.log(line.trim());
  }

  writeToDb({ level, method, route, message, meta, status_code });
}

module.exports = {
  info: (message, options) => log('info', message, options),
  warn: (message, options) => log('warn', message, options),
  error: (message, options) => log('error', message, options),
};
