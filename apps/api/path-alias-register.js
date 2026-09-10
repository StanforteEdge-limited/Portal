const Module = require("module");
const path = require("path");
const PREFIXES = ["modules", "common", "app"];
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  for (const p of PREFIXES) {
    const prefix = "$" + p + "/";
    if (request.startsWith(prefix)) {
      const inDist = String(parent && parent.filename).includes(path.sep + "dist" + path.sep);
      const base = inDist ? "dist" : "src";
      request = path.join(__dirname, base, p === "app" ? "" : p, request.slice(prefix.length));
      break;
    }
  }
  return originalResolve.call(this, request, parent, isMain, options);
};