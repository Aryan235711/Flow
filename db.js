import pg from 'pg';

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

// Create a single pool for the app. SSL on by default for hosted DBs; can be disabled locally.
export const pool = new Pool({
  connectionString,
  ssl: connectionString && connectionString.includes('render.com') ? { rejectUnauthorized: false } : undefined
});

export async function runQuery(text, params) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

export async function initSchema() {
  // Idempotent schema creation; safe to call on startup.
  const statements = [
    `create extension if not exists "uuid-ossp";`,
    `create table if not exists users (
       id uuid primary key default uuid_generate_v4(),
       email text unique not null
     );`,
    `alter table users alter column id type uuid using uuid_generate_v4();`,
    `alter table users alter column id set default uuid_generate_v4();`,
    `alter table users add column if not exists name text;`,
    `alter table users add column if not exists picture text;`,
    `alter table users add column if not exists avatar_seed text default 'Felix';`,
    `alter table users add column if not exists is_premium boolean default false;`,
    `alter table users add column if not exists created_at timestamptz default now();`,
    `alter table users add column if not exists updated_at timestamptz default now();`,
    `create table if not exists user_config (
       user_id uuid primary key references users(id) on delete cascade,
       wearable_baselines jsonb not null,
       manual_targets jsonb not null,
       streak_logic jsonb not null,
       updated_at timestamptz default now()
     );`,
    `create table if not exists history (
       id uuid primary key default uuid_generate_v4(),
       user_id uuid references users(id) on delete cascade,
       date date not null,
       payload jsonb not null,
       created_at timestamptz default now(),
       updated_at timestamptz default now(),
       unique(user_id, date)
     );`
  ];
  for (const stmt of statements) {
    await runQuery(stmt);
  }
}
