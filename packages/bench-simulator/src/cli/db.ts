import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'
import { drizzle } from 'drizzle-orm/node-sqlite'
import { migrate } from 'drizzle-orm/node-sqlite/migrator'
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const measurements = sqliteTable('measurements', {
  id: integer().primaryKey({ autoIncrement: true }),
  startedAt: integer().notNull(),
  dataset: text().notNull(),
  algorithm: text().notNull(),
  multiplier: integer().notNull(),
  nodes: integer().notNull(),
  run: integer().notNull(),
  time: real().notNull(),
  msgCount: integer().notNull(),
})

const path = fileURLToPath(new URL('../../../../assets/bench-cloudping.sqlite', import.meta.url))
const migrationsFolder = fileURLToPath(new URL('../../drizzle', import.meta.url))

export function openDb() {
  const db = drizzle({
    client: new DatabaseSync(path),
  })
  migrate(db, { migrationsFolder })

  return db
}
