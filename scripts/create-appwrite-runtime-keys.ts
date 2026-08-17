import nextEnv from "@next/env";
import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

nextEnv.loadEnvConfig(process.cwd());
const required = (name: string) => { const value = process.env[name]?.trim(); if (!value) throw new Error(`${name} is required`); return value; };
const provisioningKey = readFileSync(required("APPWRITE_PROVISIONING_KEY_FILE"), "utf8").trim();
const endpoint = required("APPWRITE_ENDPOINT"), projectId = required("APPWRITE_PROJECT_ID"), outputFile = required("APPWRITE_API_KEY_FILE");
const scopes = ["sessions.write", "users.read", "users.write", "databases.read", "databases.write", "documents.read", "documents.write", "files.read", "files.write"];
const request = { method: "POST", headers: { "Content-Type": "application/json", "X-Appwrite-Project": projectId, "X-Appwrite-Key": provisioningKey }, body: JSON.stringify({ keyId: randomUUID().replaceAll("-", "").slice(0, 36), name: "PAC-SM production runtime", scopes }) } as const;
let response = await fetch(`${endpoint}/project/keys`, request);
if (response.status === 404) response = await fetch(`${endpoint}/projects/${projectId}/keys`, request);
const result = await response.json() as { secret?: string; message?: string };
if (!response.ok || !result.secret) throw new Error(result.message ?? response.statusText);
mkdirSync(dirname(outputFile), { recursive: true });
writeFileSync(outputFile, `${result.secret}\n`, { encoding: "utf8", mode: 0o600 });
process.stdout.write(`Created one PAC-SM runtime key with ${scopes.length} limited scopes.\n`);
