BEGIN TRANSACTION;

DROP TABLE IF EXISTS "logs";
DROP TABLE IF EXISTS "elements_tags";
DROP TABLE IF EXISTS "elements";
DROP TABLE IF EXISTS "statuses";
DROP TABLE IF EXISTS "tags";
DROP TABLE IF EXISTS "types";

CREATE TABLE "statuses" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "name" TEXT NOT NULL UNIQUE
);

CREATE TABLE "types" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "name" TEXT NOT NULL UNIQUE
);

CREATE TABLE "tags" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "name" TEXT NOT NULL UNIQUE,
  "created_at" INTEGER NOT NULL,
  "modified_at" INTEGER
);

CREATE TABLE "elements" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "name" TEXT NOT NULL,
  "type" INTEGER NOT NULL,
  "status" INTEGER NOT NULL,
  "created_at" INTEGER NOT NULL,
  "modified_at" INTEGER,
  FOREIGN KEY ("type") REFERENCES "types"("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  FOREIGN KEY ("status") REFERENCES "statuses"("id") ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE "elements_tags" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "element_id" INTEGER NOT NULL,
  "tag_id" INTEGER NOT NULL,
  UNIQUE ("element_id", "tag_id"),
  FOREIGN KEY ("element_id") REFERENCES "elements"("id") ON DELETE CASCADE,
  FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE
);

CREATE TABLE "logs" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "level" TEXT NOT NULL,
  "method" TEXT,
  "route" TEXT,
  "message" TEXT NOT NULL,
  "meta" TEXT,
  "status_code" INTEGER,
  "created_at" INTEGER NOT NULL
);

INSERT INTO "statuses" ("id", "name") VALUES
  (1, 'does_not_apply'),
  (2, 'not_planned_yet'),
  (3, 'planned'),
  (4, 'to_do'),
  (5, 'doing'),
  (6, 'done'),
  (7, 'canceled'),
  (8, 'paused'),
  (9, 'archived');

INSERT INTO "types" ("id", "name") VALUES
  (1, 'cache'),
  (2, 'areas'),
  (3, 'projects'),
  (4, 'tasks'),
  (5, 'resources');

COMMIT;
