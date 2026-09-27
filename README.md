# envseal
Locally Encrypt/Decrypt env files using password

## Install / Run
npx envseal --pass "masterpass"

By default:
- input: .env
- output: .env.enc

## Encrypt custom file
npx envseal --pass "masterpass" --in .env.local --out .env.local.enc

## Decrypt
npx envseal --decrypt --pass "masterpass" --in .env.enc --out .env

## Overwrite output
npx envseal --pass "masterpass" --force

## Test
npm test

## Coverage
npm run coverage