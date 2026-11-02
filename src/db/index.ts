import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

// 单文件数据库：默认放在项目根目录的 data/ 下，可用 DB_FILE 覆盖
const dbFile = path.resolve(
  /*turbopackIgnore: true*/
  process.env.DB_FILE || path.join(process.cwd(), 'data', 'blog.db'),
);
fs.mkdirSync(path.dirname(dbFile), { recursive: true });

// 开发环境热更新会重复执行模块，用 globalThis 缓存连接，避免打开多个数据库句柄
const globalForDb = globalThis as unknown as { __blogSqlite?: Database.Database };

const sqlite = globalForDb.__blogSqlite ?? new Database(dbFile);

// WAL 提升并发读性能；SQLite 的外键约束默认关闭，必须显式开启
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

if (process.env.NODE_ENV !== 'production') {
  globalForDb.__blogSqlite = sqlite;
}

export const db = drizzle(sqlite, { schema });
export { schema };
