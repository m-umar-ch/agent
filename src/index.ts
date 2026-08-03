import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/bun-sqlite';

const db = drizzle(process.env.DB_FILE_NAME!);


const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

export default app
