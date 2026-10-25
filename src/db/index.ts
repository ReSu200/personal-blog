import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from './schema';

const globalForDb = globalThis as unknown as { __blogPool?: mysql.Pool };

const pool =
  globalForDb.__blogPool ??
  mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    charset: 'utf8mb4',
    timezone: '+08:00',
  });

if (process.env.NODE_ENV !== 'production') {
  globalForDb.__blogPool = pool;
}

export const db = drizzle(pool, { schema, mode: 'default' });
export { schema };
