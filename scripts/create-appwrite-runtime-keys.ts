import nextEnv from "@next/env";
import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

nextEnv.loadEnvConfig(process.cwd());
const required = (name: string) => { const value = process.env[name]?.trim(); if (!value) throw new Error(`${name} is required`); return value; };
const provisioningFile = required("APPWRITE_PROVISIONING_KEY_FILE"), provisioningKey = readFileSync(provisioningFile, "utf8").trim();
const endpoint = required("APPWRITE_ENDPOINT"), projectId = required("APPWRITE_PROJECT_ID");
const definitions = [
  { name: "PAC-SM database runtime", file: required("APPWRITE_DATABASE_API_KEY_FILE"), scopes: ["databases.read", "databases.write"] },
  { name: "PAC-SM authentication runtime", file: required("APPWRITE_AUTH_API_KEY_FILE"), scopes: ["users.read", "users.write", "sessions.write"] },
  { name: "PAC-SM storage runtime", file: required("APPWRITE_STORAGE_API_KEY_FILE"), scopes: ["buckets.read", "buckets.write", "files.read", "files.write"] }
];

for (const definition of definitions) {
  const request = { method: "POST", headers: { "Content-Type": "application/json", "X-Appwrite-Project": projectId, "X-Appwrite-Key": provisioningKey }, body: JSON.stringify({ keyId: randomUUID().replaceAll("-", "").slice(0, 36), name: definition.name, scopes: definition.scopes }) } as const;
  let response = await fetch(`${endpoint}/project/keys`, request);
  if (response.status === 404) response = await fetch(`${endpoint}/projects/${projectId}/keys`, request);
  const result = await response.json() as { secret?: string; message?: string };
  if (!response.ok || !result.secret) throw new Error(`${definition.name}: ${result.message ?? response.statusText}`);
  mkdirSync(dirname(definition.file), { recursive: true });
  writeFileSync(definition.file, `${result.secret}\n`, { encoding: "utf8", mode: 0o600 });
  process.stdout.write(`Created ${definition.name}\n`);
}
