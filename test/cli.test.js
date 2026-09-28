import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const cliPath = path.resolve("bin", "cli.js");

async function withTempDir(fn) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "encryptenv-test-"));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function runCli(args, cwd, env = {}) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd,
    env: { ...process.env, ...env },
    encoding: "utf8"
  });
}

describe("encryptenv cli", function () {
  const TEST_PASS = "fixture-pass-123";
  const TEST_PASS_WITH_BANG = "fixture!pass-123";

  it("encrypts .env into .env.enc", async function () {
    await withTempDir(async (cwd) => {
      await writeFile(path.join(cwd, ".env"), "A=1\nB=two\n", "utf8");

      const result = runCli(["--pass", TEST_PASS], cwd);

      assert.equal(result.status, 0, result.stderr || result.stdout);
      const encContent = await readFile(path.join(cwd, ".env.enc"), "utf8");
      const payload = JSON.parse(encContent);

      assert.equal(payload.v, "1");
      assert.equal(payload.alg, "aes-256-gcm");
      assert.equal(payload.kdf.name, "scrypt");
      assert.ok(payload.iv);
      assert.ok(payload.tag);
      assert.ok(payload.ct);
    });
  });

  it("decrypts encrypted file back to original content", async function () {
    await withTempDir(async (cwd) => {
      const originalEnv = "TOKEN=abc123\nMODE=prod\n";
      await writeFile(path.join(cwd, ".env"), originalEnv, "utf8");

      const encResult = runCli(["--pass", TEST_PASS], cwd);
      assert.equal(encResult.status, 0, encResult.stderr || encResult.stdout);

      const decResult = runCli(
        [
          "--decrypt",
          "--pass",
          TEST_PASS,
          "--in",
          ".env.enc",
          "--out",
          ".env.dec"
        ],
        cwd
      );

      assert.equal(decResult.status, 0, decResult.stderr || decResult.stdout);
      const roundTrip = await readFile(path.join(cwd, ".env.dec"), "utf8");
      assert.equal(roundTrip, originalEnv);
    });
  });

  it("fails decryption with wrong password", async function () {
    await withTempDir(async (cwd) => {
      await writeFile(path.join(cwd, ".env"), "SECRET=value\n", "utf8");

      const encResult = runCli(["--pass", TEST_PASS], cwd);
      assert.equal(encResult.status, 0, encResult.stderr || encResult.stdout);

      const decResult = runCli(
        ["--decrypt", "--pass", "wrongpass", "--in", ".env.enc", "--out", ".env.dec"],
        cwd
      );

      assert.notEqual(decResult.status, 0);
      assert.match(decResult.stderr, /Failed:/);
    });
  });

  it("fails when password is missing and warns about single quotes", async function () {
    await withTempDir(async (cwd) => {
      const result = runCli([], cwd, { ENVSEAL_PASS: "" });
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /Error: --pass is required/);
      assert.match(result.stderr, /single quotes/);
    });
  });

  it("encrypts and decrypts with password containing special character !", async function () {
    await withTempDir(async (cwd) => {
      const originalEnv = "SECRET_KEY=special!pass\n";
      await writeFile(path.join(cwd, ".env"), originalEnv, "utf8");

      const encResult = runCli(["--pass", TEST_PASS_WITH_BANG], cwd);
      assert.equal(encResult.status, 0, encResult.stderr || encResult.stdout);

      const decResult = runCli(
        ["--decrypt", "--pass", TEST_PASS_WITH_BANG, "--in", ".env.enc", "--out", ".env.dec"],
        cwd
      );
      assert.equal(decResult.status, 0, decResult.stderr || decResult.stdout);
      const roundTrip = await readFile(path.join(cwd, ".env.dec"), "utf8");
      assert.equal(roundTrip, originalEnv);
    });
  });

  it("supports ENVSEAL_PASS environment variable", async function () {
    await withTempDir(async (cwd) => {
      await writeFile(path.join(cwd, ".env"), "KEY=val\n", "utf8");

      const encResult = runCli([], cwd, { ENVSEAL_PASS: TEST_PASS_WITH_BANG });
      assert.equal(encResult.status, 0, encResult.stderr || encResult.stdout);

      const decResult = runCli(
        ["--decrypt", "--in", ".env.enc", "--out", ".env.dec"],
        cwd,
        { ENVSEAL_PASS: TEST_PASS_WITH_BANG }
      );
      assert.equal(decResult.status, 0, decResult.stderr || decResult.stdout);
      const roundTrip = await readFile(path.join(cwd, ".env.dec"), "utf8");
      assert.equal(roundTrip, "KEY=val\n");
    });
  });

  it("shows bash warning in --help output", function () {
    const result = runCli(["--help"]);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /Note on special characters in bash/);
    assert.match(result.stdout, /single quotes/);
  });
});
