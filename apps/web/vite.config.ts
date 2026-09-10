import { fileURLToPath, URL } from "node:url";
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import type { Plugin } from "vite";

// Read package.json version
const pkg = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf-8")
) as { version: string };

// Parse CHANGELOG.md into JSON
function parseChangelog(md: string) {
  const entries: Array<{
    version: string;
    date: string;
    sections: Record<string, string[]>;
  }> = [];

  let current: (typeof entries)[0] | null = null;
  let currentSection = "";

  for (const raw of md.split("\n")) {
    const line = raw.trimEnd();
    const versionMatch = line.match(/^## \[(.+?)\] ?[—-] ?(.+)/);
    if (versionMatch) {
      if (current) entries.push(current);
      current = { version: versionMatch[1], date: versionMatch[2].trim(), sections: {} };
      currentSection = "";
      continue;
    }
    const sectionMatch = line.match(/^### (.+)/);
    if (sectionMatch && current) {
      currentSection = sectionMatch[1];
      current.sections[currentSection] = [];
      continue;
    }
    const bulletMatch = line.match(/^- (.+)/);
    if (bulletMatch && current && currentSection) {
      current.sections[currentSection].push(bulletMatch[1]);
    }
  }
  if (current) entries.push(current);
  return entries;
}

const changelogMd = readFileSync(new URL("./CHANGELOG.md", import.meta.url), "utf-8");
const changelog = parseChangelog(changelogMd);
const buildDate = new Date().toISOString().slice(0, 10);
const builtAt = new Date().toISOString();

// Build version: auto-increments on every deploy from base commit count
const BASE_COMMIT = 332; // set on 2026-04-27 — do not change
let commitCount = BASE_COMMIT;
try {
  commitCount = Number(execSync("git rev-list --count HEAD").toString().trim());
} catch {
  // not in a git repo (e.g. CI sandbox) — fall back to base
}
const buildPatch = Math.max(0, commitCount - BASE_COMMIT);
const buildVersion = `1.0.${buildPatch}`;

// Vite plugin: writes public/version.json after each build
function versionManifestPlugin(): Plugin {
  return {
    name: "version-manifest",
    closeBundle() {
      const manifest = JSON.stringify(
        {
          app_version: pkg.version,
          build_version: buildVersion,
          built_at: builtAt,
        },
        null,
        2,
      );
      writeFileSync(
        new URL("./public/version.json", import.meta.url),
        manifest,
        "utf-8",
      );
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const base = env.VITE_APP_BASE_PATH || "/";

  return {
    base,
    plugins: [react(), versionManifestPlugin()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
        "@stanforte/shared": fileURLToPath(new URL("../shared/src/index.ts", import.meta.url)),
      },
    },
    define: {
      "import.meta.env.VITE_APP_VERSION": JSON.stringify(pkg.version),
      "import.meta.env.VITE_APP_BUILD_DATE": JSON.stringify(buildDate),
      "import.meta.env.VITE_BUILD_VERSION": JSON.stringify(buildVersion),
      "import.meta.env.VITE_APP_BUILT_AT": JSON.stringify(builtAt),
      "import.meta.env.VITE_CHANGELOG": JSON.stringify(JSON.stringify(changelog)),
      "import.meta.env.VITE_DOWNLOAD_BASE_URL": JSON.stringify(
        env.VITE_DOWNLOAD_BASE_URL || "/downloads"
      ),
    },
    server: {
      port: 5173,
      strictPort: true,
    },
  };
});