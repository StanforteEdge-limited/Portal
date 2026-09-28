const { cpSync, existsSync, mkdirSync } = require('node:fs');
const { resolve } = require('node:path');

const source = resolve(__dirname, '../src/templates');
const destination = resolve(__dirname, '../dist/templates');

if (existsSync(source)) {
  mkdirSync(destination, { recursive: true });
  cpSync(source, destination, { recursive: true });
} else {
  console.error(`Template source directory not found: ${source}`);
  process.exit(1);
}