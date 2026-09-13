/**
 * Copies Handlebars email templates into the compiled output so templates
 * survive `tsc` -> `dist` (tsc does not copy non-TS assets). Runs after the
 * tsc build step.
 */
const { mkdirSync, copyFileSync, readdirSync, existsSync } = require('node:fs');
const { join, resolve } = require('node:path');

const srcDir = resolve(__dirname, '..', 'src', 'common', 'mail', 'templates');
const outDir = resolve(__dirname, '..', 'dist', 'common', 'mail', 'templates');

if (!existsSync(srcDir)) {
  console.warn('copy-email-templates: source templates directory not found, skipping');
  process.exit(0);
}

mkdirSync(outDir, { recursive: true });

const files = readdirSync(srcDir).filter((file) => file.endsWith('.hbs'));
for (const file of files) {
  copyFileSync(join(srcDir, file), join(outDir, file));
}

console.log(`copy-email-templates: copied ${files.length} email template(s) to dist/common/mail/templates`);