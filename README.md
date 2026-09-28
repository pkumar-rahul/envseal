# envseal
Locally Encrypt/Decrypt env files using password

## Install / Run
npx @salimshamim/envseal --pass 'masterpass'

By default:
- input: .env
- output: .env.enc

## Encrypt custom file
npx @salimshamim/envseal --pass 'masterpass' --in .env.local --out .env.local.enc

## Decrypt
npx @salimshamim/envseal --decrypt --pass 'masterpass' --in .env.enc --out .env

## Overwrite output
npx @salimshamim/envseal --pass 'masterpass' --force

## Environment Variable
You can also supply your password via `ENVSEAL_PASS`:
```bash
export ENVSEAL_PASS='masterpass'
npx @salimshamim/envseal
npx @salimshamim/envseal --decrypt --in .env.enc --out .env
```

## Note on Special Characters in Bash (`!`)
If your password contains `!`, always wrap it in **single quotes** (`'...'`) in bash/zsh:
```bash
npx @salimshamim/envseal --pass 'my!secret@1'
```
> **Why?** In interactive bash, `!` inside double quotes (`"..."`) triggers shell history expansion *before* the CLI even starts, leading to `bash: !...: event not found`.

## Test
npm test

## Coverage
npm run coverage

## Contribution Guide

### Local setup
```bash
npm install
npm test
npm run coverage
```

### Manual CLI test sequence
1. Create a sample env file:
```bash
printf "API_KEY=abc123\nMODE=dev\n" > .env
```

2. Encrypt it:
```bash
node bin/cli.js --pass 'localTest!123'
```

3. Decrypt to a different file:
```bash
node bin/cli.js --decrypt --in .env.enc --out .env.dec --pass 'localTest!123'
```

4. Verify round-trip content:
```bash
cat .env.dec
```

Expected result: `.env.dec` should match the original `.env` content exactly.

### Optional: Use environment variable instead of `--pass`
```bash
export ENVSEAL_PASS='localTest!123'
node bin/cli.js
node bin/cli.js --decrypt --in .env.enc --out .env.dec
```

Tip: In bash/zsh, if password contains `!`, always use single quotes (`'...'`).