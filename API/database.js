import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from 'path';

sqlite3.verbose();

// Single connection manager for production stability
const DB_FILE = process.env.DATABASE_FILE || path.resolve(process.cwd(), 'database.db');

let dbPromise = null;
async function getDb() {
  if (!dbPromise) {
    dbPromise = open({
      filename: DB_FILE,
      driver: sqlite3.Database
    });
  }
  return dbPromise;
}

async function run(query, params = []) {
  const db = await getDb();
  return db.run(query, params);
}

async function all(query, params = []) {
  const db = await getDb();
  return db.all(query, params);
}

async function close() {
  if (!dbPromise) return;
  const db = await dbPromise;
  await db.close();
  dbPromise = null;
}

export default { run, all, close };
