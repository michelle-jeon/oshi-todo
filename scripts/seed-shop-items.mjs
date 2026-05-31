import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const itemsPath = path.join(rootDir, "data", "shop-items.json");
const items = JSON.parse(fs.readFileSync(itemsPath, "utf8"));

function sqlString(value) {
  if (value === null || value === undefined) {
    return "null";
  }

  return `'${String(value).replaceAll("'", "''")}'`;
}

function payloadSql(payload) {
  return `${sqlString(JSON.stringify(payload))}::jsonb`;
}

const values = items
  .map(
    (item) =>
      `  (${sqlString(item.code)}, ${sqlString(item.name)}, ${sqlString(item.slot)}, ${sqlString(
        item.species
      )}, ${Number(item.cost)}, ${payloadSql(item.payload)})`
  )
  .join(",\n");

const sql = `insert into public.shop_items (code, name, slot, species, cost, payload)\nvalues\n${values}\non conflict (code) do update set\n  name = excluded.name,\n  slot = excluded.slot,\n  species = excluded.species,\n  cost = excluded.cost,\n  payload = excluded.payload,\n  is_active = true;\n`;

process.stdout.write(sql);
