# StanforteEdge Portal — Working Session Summary

## Cohesive Summary
Multi-app monorepo (`apps/api` NestJS+drizzle+postgres+redis/BullMQ+puppeteer, `apps/web` Vite React, `apps/desktop` Vite React, `apps/shared`) on pnpm. This session containerized the backend + frontend and got the **full stack running end-to-end in Docker** (postgres + redis + mailpit infra were already up). That required: a root `pnpm-lock.yaml` resync (BullMQ deps were never locked), a real type-safety bug fix in two drizzle model files (self-referencing tables), a pre-existing broken migration (`uuid`→`bigint` cast), three API env gaps in compose, and an unbalanced-div JSX bug in the shared AdminOrganizationSlideOver file (committed earlier with the branding work — never parsed at runtime until the web container started). All are now fixed and verified live.

## Objective
- Containerize backend + frontend: separate Dockerfiles (`apps/api/Dockerfile`, `apps/web/Dockerfile`) orchestrated by root `docker-compose.yml` so postgres/redis/mailpit + api + web start together — DONE, stack live.
- Carry-over from prior sessions (background-jobs migration, per-org clock-out reminders, per-org branding) implemented and committed (`6cfc64c`); containerization exposed and fixed latent bugs in that committed work.

## Important Details
- **No node/pnpm on this host** (verified) — Docker is the only build/run path. Docker Desktop exe: `C:\Users\USER\AppData\Local\Programs\DockerDesktop\frontend\Docker Desktop.exe`.
- Network to Docker registries is flaky (DNS + `tls: bad record MAC`); retry loops work. Long builds: run via `Start-Process cmd.exe /c '... > log 2>&1'` + poll the log (the shell tool kills foreground cmd at timeout; do not rely on `Tee-Object`).
- **drizzle self-reference gotcha (root cause of all 14 build errors):** a table that `references(() => ItsOwnTable.id)` inside its own `pgTable(...)` initializer gets `typeof table = any` (const referenced in own initializer), which poisons `defineRelationsPart` (`any extends FilteredSchemaEntry ? … : …` resolves to `boolean` → `DrizzleTypeError<"Views with nested selections…"> | (RelationsBuilderColumns<any, …> & …)` unions). Fix = drizzle's canonical pattern: annotate the FK callback `references((): AnyPgColumn => table.id, …)` with `AnyPgColumn` from `drizzle-orm/pg-core`. Affected: `chatMessage.replyToMessageId`, `storageFolder.parentId`.
- Lockfile: committed host `pnpm-lock.yaml` was missing BullMQ/upstream deps → `ERR_PNPM_OUTDATED_LOCKFILE`. Container regenerated a clean one via `pnpm install --fix-lockfile` at docker build time; that lockfile was extracted and committed to the repo (+532/-18), so both Dockerfiles now safely use `--frozen-lockfile`.
- Dependency pins (from container/committed lockfile): drizzle-orm `1.0.0-rc.4` (exact), @nestjs/schedule `4.1.2` (no `CronExpression.EVERY_15_MINUTES` — must use `@Cron('0 */15 * * * *')`), bullmq `6.3.4`, @nestjs/bullmq `12.0.0`, puppeteer `24.43.1`, node in image `20-alpine` (v20.20.2), pnpm pinned `10.33.0` via corepack.
- `.npmrc` sets `puppeteer_skip_download=true`; API image installs system Chromium (`apk add chromium …`) with `PDF_BROWSER_PATH=/usr/bin/chromium-browser`.
- API Docker runtime: `WORKDIR /app/apps/api`, CMD = `pnpm drizzle:migrate && node -r ./path-alias-register.js dist/main.js`. `build` script = `NODE_OPTIONS=--max-old-space-size=4096 tsc -p tsconfig.build.json && node scripts/copy-email-templates.js`.
- Migrations live in `apps/api/drizzle/<timestamp_xxx>/migration.sql`; tracked in `__drizzle_migrations` by hash; failing migrations are fatal at container start.
- Compose passes env interpolated from a root `.env` if present (none exists → defaults in docker-compose.yml). API env gotchas that crashed startup: `MAIL_ENCRYPTION_KEY` must be 64-char hex (32 bytes), and `main.js` throws if JWT secrets are the literal defaults `change-me`/`change-me-too`. Dev secrets generated earlier and stored in gitignored `apps/api/.env`; compose defaults now mirror them: JWT_SECRET=`D06BB4071445202E0C4557CDF9A1CD41729F84EA3CFDEB4C81F8B613DE9B9B82`, JWT_REFRESH_SECRET=`62A6E88613570318A90FF88EC92BECB5F3D39A4A6D933CFC263D2177D9F2C8C1`, MAIL_ENCRYPTION_KEY=`586B9AB2AAB9A0F8BB77E18F3A1E33156031AC69B8C38819FA5DD1523C65372B`.
- Web dev image bind-mounts `./apps/web/src` and `./apps/shared/src` (`:ro`) so Vite hot-reloads host edits; `VITE_API_BASE_URL=http://localhost:3000/v1` (browser hits API via host port 3000). Web prod target = `nginx:1.25-alpine`, copies `dist`, nginx.conf proxies `/v1/` + `/socket.io/` to `http://api:3000`.
- Compose service names/images: project dir `portal` → images `portal-api:latest`, `portal-web:latest`; containers `portal-api-1`, `portal-web-1`, `portal-postgres-1`, `portal-redis-1`, `portal-mailpit-1`; network `portal_default`; volumes `portal-postgres`/`portal-redis`/`portal-mailpit`. Postgres defaults `stanforte`/`stanforte-dev`/`stanforte`.
- Windows PowerShell quirks: no `head`/`tail`; use `Select-Object -First/-Last`; `2>&1` merges stderr (docker CLI writes build progress to stderr); where `$_.CommandLine` matches longer-lived backgrounded `cmd /c` jobs, `Get-CimInstance Win32_Process` finds them — kill stale ones to avoid false "still running" polls.
- `.dockerignore` at repo root must NOT ignore Dockerfiles. Repo commit style is conventional commits. Git warns LF→CRLF on staging (harmless). `docker compose config --quiet` passes.

## Work State
### Completed
- Commit `6cfc64c` (prior session): background jobs pipeline (api module, shared `jobs-api.ts`, web/desktop consumers), per-org attendance clock-out reminders, per-org branding (themes.ts, tailwind `primary/brand` 50–900 → `rgb(var(--brand-X)/…)`, styles.css vars, `serializeProfile`+=`logo_url`/`theme`, `BrandingProvider`/`useOrgBranding`, TopBar org logo, AdminOrganizationSlideOver Branding section incl. theme picker + `uploadFileAsset` logo upload, duplicate Logo URL removed). NOTE: that slideover file carried a pre-existing JSX bug (see below).
- Diagnosed + fixed all 3 pre-existing API build blockers using the `portal-api:dev-deps` image (install-only cache for fast tsc iteration via `docker run -v <abs>apps/api/src:/app/apps/api/src -w /app/apps/api portal-api:dev-deps npx tsc -p tsconfig.build.json --pretty false`):
  - `repository.service.ts:519` → `… as T[]`
  - `chat.service.ts:343` → explicit `let list = map.get(key); if (!list) {...}` (no `||=`)
  - `chat/model.ts` + `storage/model.ts` → `(): AnyPgColumn =>` on the two self-referencing FK callbacks (above). Verified with a probe file (all 8 `FilteredSchemaEntry` checks → `true`; both tables resolve to real `PgTableWithColumns<…>`) then removed the probe.
- `pnpm-lock.yaml` resynced into repo from dev-deps image (`docker run -v …:/out portal-api:dev-deps cp /app/pnpm-lock.yaml /out/`).
- `apps/api/Dockerfile` + `apps/web/Dockerfile` (dev default target; build+prod nginx targets) + `apps/web/nginx.conf` + root `.dockerignore` written; both installs now `--frozen-lockfile`; `docker-compose.yml` gained `api` + `web` services with `depends_on`/`service_healthy`, ports 3000/5173, web src/shared bind mounts.
- Built `portal-api:latest` (frozen install passed, tsc green, `copy-email-templates: copied 4 email template(s)`), rebuilt after migration fix.
- Fixed broken migration `apps/api/drizzle/20260913015230_shallow_squadron_sinister/migration.sql` line 5: `ALTER TABLE sta_form_submissions ALTER COLUMN organization_id SET DATA TYPE bigint USING organization_id::bigint` (uuid→bigint cast is invalid in PG) → replaced with `DROP COLUMN` + `ADD COLUMN organization_id bigint`.
- Added missing API env in compose: `MAIL_ENCRYPTION_KEY` + real JWT defaults (above).
- Fixed unclosed `<div>` in `AdminOrganizationSlideOver.tsx` web + desktop: "Branding" section border div (opened before the color-theme `<SelectField>`) was never closed → 8 open/7 close → `Unexpected closing "SlideOverContent" tag…` ran Vite/esbuild transform. Added the missing `</div>` before the "Corporate Metadata" section; both files now 8/8 balanced; web module transforms 200 (53KB).
- **Full stack live:** `portal-api-1` Up, `GET /v1/health` → 200 `{"success":true,"data":{"status":"ok"}}`, all modules initialized (Admin/Auth/Chat/BackgroundJobs/Mail/Hr/Payroll/Finance/Requests/Workspace/Billing…), DbService "Database connected", Presence Redis pub/sub ready; `portal-web-1` Up, Vite dev serving :5173; postgres/redis/mailpit all healthy; migrations applied successfully on fresh DB.

### Active
- None — stack green.

### Blocked
- No local node/pnpm on host (host-level scripts still need node; container path works).
- Docker hub/auth registry flakiness can intermittently fail pulls (retry loops handle it).

## Next Move
1. Commit the uncommitted work when user asks (conventional message, e.g. `feat(docker): containerize api + web with root compose; fix drizzle self-ref typing, broken migration, slideover JSX`). Files: `.dockerignore`, `apps/api/Dockerfile`, `apps/web/Dockerfile`, `apps/web/nginx.conf`, `docker-compose.yml`, `pnpm-lock.yaml`, `apps/api/src/common/db/repository.service.ts`, `apps/api/src/modules/communication/chat/chat.service.ts`, `apps/api/src/modules/communication/chat/model.ts`, `apps/api/src/modules/hr/hr/attendance.scheduler.ts`, `apps/api/src/modules/storage/model.ts`, `apps/web+.../desktop/.../AdminOrganizationSlideOver.tsx`, `apps/api/drizzle/20260913015230_shallow_squadron_sinister/migration.sql`.
2. If the user wants a fresh-tear-down test: `docker compose down -v` then `docker compose up -d --build` (verify api migrates + starts on empty DB).
3. Optionally smoke-test auth flow via Mailpit (:8025) and the full portal in browser (:5173).

## Relevant Files
- `.dockerignore`, `docker-compose.yml` (infra + api + web), `apps/api/Dockerfile`, `apps/web/Dockerfile` (dev/build/prod nginx), `apps/web/nginx.conf`.
- `apps/api/src/modules/communication/chat/model.ts` + `apps/api/src/modules/storage/model.ts` — `(): AnyPgColumn` self-ref FK fix (Active-fix remnants gone; these compile).
- `apps/api/src/common/db/repository.service.ts`, `apps/api/src/modules/communication/chat/chat.service.ts`, `apps/api/src/modules/hr/hr/attendance.scheduler.ts` — other build blockers fixed.
- `apps/api/drizzle/20260913015230_shallow_squadron_sinister/migration.sql` — uuid→bigint migration fix.
- `apps/web/src/pages/admin/organizations/AdminOrganizationSlideOver.tsx`, `apps/desktop/src/pages/admin/organizations/AdminOrganizationSlideOver.tsx` — branding modals (byte-identical; JSX balances).
- `pnpm-lock.yaml` — resynced (+532/-18).
- `apps/api/.env`, `apps/web/.env`, `apps/desktop/.env` — gitignored dev assets; values mirrored in compose defaults.
- Images/containers: `portal-api:latest`, `portal-web:latest`, `portal-api:dev-deps`; temp Dockerfile `C:\Users\USER\AppData\Local\Temp\opencode\api-deps.Dockerfile`; build logs `…\apibuild*.log`, `…\composeup.log`.
- Prior reference commit: `6cfc64c`.