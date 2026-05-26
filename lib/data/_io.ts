import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");

export async function readJson<T>(name: string): Promise<T> {
  const file = path.join(DATA_DIR, name);
  const buf = await fs.readFile(file, "utf-8");
  return JSON.parse(buf) as T;
}

export async function writeJson<T>(name: string, value: T): Promise<void> {
  const file = path.join(DATA_DIR, name);
  const text = JSON.stringify(value, null, 2) + "\n";
  await fs.writeFile(file, text, "utf-8");
}
