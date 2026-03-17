require("dotenv").config();
const path = require("path");
const express = require('express');
const cors = require('cors');
const db = require('./db');
const logger = require('./logger');

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";

const isProduction = NODE_ENV === "production";
const serveFrontend =
  process.env.SERVE_FRONTEND === "true" || NODE_ENV === "production";

app.use(express.json());

// CORS only in development
if (NODE_ENV === "development") {
  app.use(
    cors({
      origin: "http://127.0.0.1:5173",
    })
  );
}

function now() {
  return Date.now();
}

function parseId(value, fieldName = 'id') {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    const error = new Error(`${fieldName} must be a positive integer`);
    error.status = 400;
    throw error;
  }
  return parsed;
}

function validateElementPayload(payload, isUpdate = false) {
  const errors = [];

  if (!isUpdate || Object.prototype.hasOwnProperty.call(payload, 'name')) {
    if (typeof payload.name !== 'string' || !payload.name.trim()) {
      errors.push('name is required and must be a non-empty string');
    }
  }

  if (!isUpdate || Object.prototype.hasOwnProperty.call(payload, 'type')) {
    if (!Number.isInteger(payload.type) || payload.type <= 0) {
      errors.push('type is required and must be a positive integer');
    }
  }

  if (!isUpdate || Object.prototype.hasOwnProperty.call(payload, 'status')) {
    if (!Number.isInteger(payload.status) || payload.status <= 0) {
      errors.push('status is required and must be a positive integer');
    }
  }

  if (errors.length > 0) {
    const error = new Error(errors.join(', '));
    error.status = 400;
    throw error;
  }
}

function validateTagPayload(payload, isUpdate = false) {
  if (!isUpdate || Object.prototype.hasOwnProperty.call(payload, 'name')) {
    if (typeof payload.name !== 'string' || !payload.name.trim()) {
      const error = new Error('name is required and must be a non-empty string');
      error.status = 400;
      throw error;
    }
  }
}

function ensureTypeExists(typeId) {
  const row = db.prepare('SELECT id FROM types WHERE id = ?').get(typeId);
  if (!row) {
    const error = new Error(`type ${typeId} does not exist`);
    error.status = 400;
    throw error;
  }
}

function ensureStatusExists(statusId) {
  const row = db.prepare('SELECT id FROM statuses WHERE id = ?').get(statusId);
  if (!row) {
    const error = new Error(`status ${statusId} does not exist`);
    error.status = 400;
    throw error;
  }
}

function ensureTagExists(tagId) {
  const row = db.prepare('SELECT id FROM tags WHERE id = ?').get(tagId);
  if (!row) {
    const error = new Error(`tag ${tagId} does not exist`);
    error.status = 400;
    throw error;
  }
}

function getElementById(id) {
  return db.prepare(`
    SELECT
      e.id,
      e.name,
      e.type,
      ty.name AS type_name,
      e.status,
      st.name AS status_name,
      e.created_at,
      e.modified_at
    FROM elements e
    INNER JOIN types ty ON ty.id = e.type
    INNER JOIN statuses st ON st.id = e.status
    WHERE e.id = ?
  `).get(id);
}

function getElementWithTags(id) {
  const element = getElementById(id);
  if (!element) return null;

  const tags = db.prepare(`
    SELECT t.id, t.name, t.created_at, t.modified_at
    FROM elements_tags et
    INNER JOIN tags t ON t.id = et.tag_id
    WHERE et.element_id = ?
    ORDER BY t.name ASC
  `).all(id);

  return { ...element, tags };
}

app.use((req, res, next) => {
  req.startedAt = Date.now();

  res.on('finish', () => {
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    logger[level]('Request completed', {
      method: req.method,
      route: req.originalUrl,
      status_code: res.statusCode,
      meta: { durationMs: Date.now() - req.startedAt },
    });
  });

  logger.info('Incoming request', {
    method: req.method,
    route: req.originalUrl,
    meta: {
      query: req.query,
      body: req.method === 'GET' ? undefined : req.body,
    },
  });
  next();
});

// API routes
app.get("/api/health", (req, res) => {
  res.json({ ok: true, env: NODE_ENV });
});

// Static frontend (optional in dev, always in prod)
if (serveFrontend) {
  const frontendPath = path.join(__dirname, "../frontend");

  app.use(express.static(frontendPath));

  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
  });
}

app.get('/api/types', (req, res, next) => {
  try {
    const rows = db.prepare('SELECT * FROM types ORDER BY id ASC').all();
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

app.get('/api/statuses', (req, res, next) => {
  try {
    const rows = db.prepare('SELECT * FROM statuses ORDER BY id ASC').all();
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

app.get('/api/tags', (req, res, next) => {
  try {
    const rows = db.prepare('SELECT * FROM tags ORDER BY name ASC').all();
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

app.post('/api/tags', (req, res, next) => {
  try {
    validateTagPayload(req.body);
    const name = req.body.name.trim();
    const timestamp = now();

    const result = db.prepare(`
      INSERT INTO tags (name, created_at, modified_at)
      VALUES (?, ?, ?)
    `).run(name, timestamp, null);

    const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(tag);
  } catch (error) {
    next(error);
  }
});

app.get('/api/tags/:id', (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const row = db.prepare('SELECT * FROM tags WHERE id = ?').get(id);
    if (!row) {
      const error = new Error('Tag not found');
      error.status = 404;
      throw error;
    }
    res.json(row);
  } catch (error) {
    next(error);
  }
});

app.put('/api/tags/:id', (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    validateTagPayload(req.body, true);

    const existing = db.prepare('SELECT * FROM tags WHERE id = ?').get(id);
    if (!existing) {
      const error = new Error('Tag not found');
      error.status = 404;
      throw error;
    }

    const name = typeof req.body.name === 'string' ? req.body.name.trim() : existing.name;

    db.prepare(`
      UPDATE tags
      SET name = ?, modified_at = ?
      WHERE id = ?
    `).run(name, now(), id);

    const updated = db.prepare('SELECT * FROM tags WHERE id = ?').get(id);
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/tags/:id', (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const existing = db.prepare('SELECT * FROM tags WHERE id = ?').get(id);
    if (!existing) {
      const error = new Error('Tag not found');
      error.status = 404;
      throw error;
    }

    const tx = db.transaction(() => {
      db.prepare('DELETE FROM elements_tags WHERE tag_id = ?').run(id);
      db.prepare('DELETE FROM tags WHERE id = ?').run(id);
    });

    tx();
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.get('/api/elements', (req, res, next) => {
  try {
    const rows = db.prepare(`
      SELECT
        e.id,
        e.name,
        e.type,
        ty.name AS type_name,
        e.status,
        st.name AS status_name,
        e.created_at,
        e.modified_at
      FROM elements e
      INNER JOIN types ty ON ty.id = e.type
      INNER JOIN statuses st ON st.id = e.status
      ORDER BY e.id ASC
    `).all();

    res.json(rows);
  } catch (error) {
    next(error);
  }
});

app.post('/api/elements', (req, res, next) => {
  try {
    validateElementPayload(req.body);
    ensureTypeExists(req.body.type);
    ensureStatusExists(req.body.status);

    const timestamp = now();
    const insert = db.prepare(`
      INSERT INTO elements (name, type, status, created_at, modified_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      req.body.name.trim(),
      req.body.type,
      req.body.status,
      timestamp,
      null
    );

    if (Array.isArray(req.body.tagIds) && req.body.tagIds.length > 0) {
      const attachTag = db.prepare(`
        INSERT OR IGNORE INTO elements_tags (element_id, tag_id)
        VALUES (?, ?)
      `);

      for (const tagId of req.body.tagIds) {
        ensureTagExists(tagId);
        attachTag.run(result.lastInsertRowid, tagId);
      }
    }

    const created = getElementWithTags(result.lastInsertRowid);
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

app.get('/api/elements/:id', (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const row = getElementWithTags(id);

    if (!row) {
      const error = new Error('Element not found');
      error.status = 404;
      throw error;
    }

    res.json(row);
  } catch (error) {
    next(error);
  }
});

app.put('/api/elements/:id', (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    validateElementPayload(req.body, true);

    const existing = db.prepare('SELECT * FROM elements WHERE id = ?').get(id);
    if (!existing) {
      const error = new Error('Element not found');
      error.status = 404;
      throw error;
    }

    const nextElement = {
      name: typeof req.body.name === 'string' ? req.body.name.trim() : existing.name,
      type: Number.isInteger(req.body.type) ? req.body.type : existing.type,
      status: Number.isInteger(req.body.status) ? req.body.status : existing.status,
    };

    ensureTypeExists(nextElement.type);
    ensureStatusExists(nextElement.status);

    const tx = db.transaction(() => {
      db.prepare(`
        UPDATE elements
        SET name = ?, type = ?, status = ?, modified_at = ?
        WHERE id = ?
      `).run(nextElement.name, nextElement.type, nextElement.status, now(), id);

      if (Array.isArray(req.body.tagIds)) {
        db.prepare('DELETE FROM elements_tags WHERE element_id = ?').run(id);
        const attachTag = db.prepare(`
          INSERT OR IGNORE INTO elements_tags (element_id, tag_id)
          VALUES (?, ?)
        `);

        for (const tagId of req.body.tagIds) {
          ensureTagExists(tagId);
          attachTag.run(id, tagId);
        }
      }
    });

    tx();
    const updated = getElementWithTags(id);
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/elements/:id', (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const existing = db.prepare('SELECT * FROM elements WHERE id = ?').get(id);
    if (!existing) {
      const error = new Error('Element not found');
      error.status = 404;
      throw error;
    }

    const tx = db.transaction(() => {
      db.prepare('DELETE FROM elements_tags WHERE element_id = ?').run(id);
      db.prepare('DELETE FROM elements WHERE id = ?').run(id);
    });

    tx();
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.get('/api/elements/:id/tags', (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const element = db.prepare('SELECT id FROM elements WHERE id = ?').get(id);
    if (!element) {
      const error = new Error('Element not found');
      error.status = 404;
      throw error;
    }

    const tags = db.prepare(`
      SELECT t.id, t.name, t.created_at, t.modified_at
      FROM elements_tags et
      INNER JOIN tags t ON t.id = et.tag_id
      WHERE et.element_id = ?
      ORDER BY t.name ASC
    `).all(id);

    res.json(tags);
  } catch (error) {
    next(error);
  }
});

app.post('/api/elements/:id/tags/:tagId', (req, res, next) => {
  try {
    const elementId = parseId(req.params.id, 'element id');
    const tagId = parseId(req.params.tagId, 'tag id');

    const element = db.prepare('SELECT id FROM elements WHERE id = ?').get(elementId);
    if (!element) {
      const error = new Error('Element not found');
      error.status = 404;
      throw error;
    }

    ensureTagExists(tagId);

    db.prepare(`
      INSERT OR IGNORE INTO elements_tags (element_id, tag_id)
      VALUES (?, ?)
    `).run(elementId, tagId);

    const updated = getElementWithTags(elementId);
    res.status(201).json(updated);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/elements/:id/tags/:tagId', (req, res, next) => {
  try {
    const elementId = parseId(req.params.id, 'element id');
    const tagId = parseId(req.params.tagId, 'tag id');

    const info = db.prepare(`
      DELETE FROM elements_tags
      WHERE element_id = ? AND tag_id = ?
    `).run(elementId, tagId);

    if (info.changes === 0) {
      const error = new Error('Element/tag relation not found');
      error.status = 404;
      throw error;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.get('/api/logs', (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
    const rows = db.prepare(`
      SELECT *
      FROM logs
      ORDER BY id DESC
      LIMIT ?
    `).all(limit);
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

app.use((req, res, next) => {
  const error = new Error(`Route ${req.method} ${req.originalUrl} not found`);
  error.status = 404;
  next(error);
});

app.use((error, req, res, next) => {
  if (error && error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    error.status = 409;
  } else if (error && error.code && error.code.startsWith('SQLITE_CONSTRAINT')) {
    error.status = 400;
  }

  const status = error.status || 500;
  const durationMs = Date.now() - (req.startedAt || Date.now());

  logger.error(error.message, {
    method: req.method,
    route: req.originalUrl,
    status_code: status,
    meta: {
      stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
      durationMs,
    },
  });

  res.status(status).json({
    error: error.message || 'Internal Server Error',
    ...(process.env.NODE_ENV !== 'production' && { stack: error.stack }),
  });
});


app.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
});
