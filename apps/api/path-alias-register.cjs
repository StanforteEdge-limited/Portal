const Module = require('node:module');
const path = require('node:path');

const PREFIXES = {
  app: '',
  apps: 'apps',
  config: 'config',
  core: 'core',
  plugins: 'plugins',
};

const originalResolve = Module._resolveFilename;

Module._resolveFilename = function resolveAlias(request, parent, isMain, options) {
  for (const [prefixName, targetDirectory] of Object.entries(PREFIXES)) {
    const prefix = `$${prefixName}/`;
    if (!request.startsWith(prefix)) continue;

    const inDist = String(parent && parent.filename).includes(path.sep + 'dist' + path.sep);
    const base = inDist ? 'dist' : 'src';
    request = path.join(__dirname, base, targetDirectory, request.slice(prefix.length));
    break;
  }

  return originalResolve.call(this, request, parent, isMain, options);
};
