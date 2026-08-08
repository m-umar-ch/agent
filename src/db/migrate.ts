import { createDbClient } from "./client";

const source = process.env.DB_FILE_NAME ?? "db.sqlite";
createDbClient(source);
console.log(`Migrations applied to ${source}.`);
