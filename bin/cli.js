#!/usr/bin/env node
import { Command } from "commander";
import { readFile, writeFile, access } from "node:fs/promises";
import crypto from "node:crypto";

const program = new Command();

const VERSION = "1";
const ALGO = "aes-256-gcm";
const KEY_LEN = 32;
const IV_LEN = 12;
const SALT_LEN = 16;
const SCRYPT_N = 32768;
const SCRYPT_R = 8;
const SCRYPT_P = 1;

function b64(buf) {
  return Buffer.from(buf).toString("base64");
}

function unb64(str) {
  return Buffer.from(str, "base64");
}

function deriveKey(password, salt) {
  return crypto.scryptSync(password, salt, KEY_LEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: 128 * 1024 * 1024
  });
}

function encryptString(plainText, password) {
  const salt = crypto.randomBytes(SALT_LEN);
  const iv = crypto.randomBytes(IV_LEN);
  const key = deriveKey(password, salt);

  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();

  return {
    v: VERSION,
    alg: ALGO,
    kdf: {
      name: "scrypt",
      N: SCRYPT_N,
      r: SCRYPT_R,
      p: SCRYPT_P,
      salt: b64(salt)
    },
    iv: b64(iv),
    tag: b64(tag),
    ct: b64(ciphertext)
  };
}

function decryptObject(payload, password) {
  if (!payload || payload.v !== VERSION || payload.alg !== ALGO || payload.kdf?.name !== "scrypt") {
    throw new Error("Unsupported encrypted payload format");
  }

  const salt = unb64(payload.kdf.salt);
  const iv = unb64(payload.iv);
  const tag = unb64(payload.tag);
  const ct = unb64(payload.ct);

  const key = crypto.scryptSync(password, salt, KEY_LEN, {
    N: payload.kdf.N,
    r: payload.kdf.r,
    p: payload.kdf.p,
    maxmem: 128 * 1024 * 1024
  });

  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);

  const plain = Buffer.concat([decipher.update(ct), decipher.final()]);
  return plain.toString("utf8");
}

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

program
  .name("encryptenv")
  .description("Encrypt/decrypt .env files for safe git transfer")
  .option("--pass <password>", "Master password")
  .option("--in <path>", "Input file path", ".env")
  .option("--out <path>", "Output file path")
  .option("--decrypt", "Decrypt mode")
  .option("--force", "Overwrite output if it exists", false)
  .parse(process.argv);

const opts = program.opts();

if (!opts.pass) {
  console.error("Error: --pass is required");
  process.exit(1);
}

const decryptMode = Boolean(opts.decrypt);
const inputPath = opts.in;
const outputPath = opts.out || (decryptMode ? ".env" : ".env.enc");

if (!opts.force && await fileExists(outputPath)) {
  console.error(`Error: Output file already exists: ${outputPath}. Use --force to overwrite.`);
  process.exit(1);
}

try {
  const input = await readFile(inputPath, "utf8");

  if (!decryptMode) {
    const encrypted = encryptString(input, opts.pass);
    await writeFile(outputPath, JSON.stringify(encrypted, null, 2) + "\n", "utf8");
    console.log(`Encrypted ${inputPath} -> ${outputPath}`);
  } else {
    const payload = JSON.parse(input);
    const decrypted = decryptObject(payload, opts.pass);
    await writeFile(outputPath, decrypted, "utf8");
    console.log(`Decrypted ${inputPath} -> ${outputPath}`);
  }
} catch (err) {
  console.error(`Failed: ${err.message}`);
  process.exit(1);
}