# envseal
Locally Encrypt/Decrypt env files using password

## Install / Run
npx @salimshamim/envseal --pass "masterpass"

By default:
- input: .env
- output: .env.enc

## Encrypt custom file
npx @salimshamim/envseal --pass "masterpass" --in .env.local --out .env.local.enc

## Decrypt
npx @salimshamim/envseal --decrypt --pass "masterpass" --in .env.enc --out .env

## Overwrite output
npx @salimshamim/envseal --pass "masterpass" --force

## Test
npm test

## Coverage
npm run coverage