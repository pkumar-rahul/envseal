# encryptenv
Locally Encrypt/Decrypt env files using password

## Install / Run
npx encryptenv --pass "masterpass"

By default:
- input: .env
- output: .env.enc

## Encrypt custom file
npx encryptenv --pass "masterpass" --in .env.local --out .env.local.enc

## Decrypt
npx encryptenv --decrypt --pass "masterpass" --in .env.enc --out .env

## Overwrite output
npx encryptenv --pass "masterpass" --force

## Test
npm test

## Coverage
npm run coverage