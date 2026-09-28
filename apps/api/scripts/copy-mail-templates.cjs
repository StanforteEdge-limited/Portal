const { cpSync, existsSync, mkdirSync } = require('node:fs');
const { resolve } = require('node:path');

const source = resolve(__dirname, '../src/mail/templates');
const destination = resolve(__dirname, '../dist/mail/templates');

if (existsSync(source)) {
  mkdirSync(destination, { recursive: true });
  cpSync(source, destination, { recursive: true });
}