# API Fastify

Django-style Fastify port scaffold.

## Layout

- `src/apps`: business domains and bounded sub-apps.
- `src/core`: shared infrastructure such as auth, db, queues, mail, cache, validation, and tenant context.
- `src/plugins`: Fastify plugins that wire infrastructure into the server.
- `src/config`: runtime configuration and environment loading.
- `src/app`: server composition and application bootstrap.
- `test`: cross-app unit and e2e tests.

Each app should keep HTTP handlers thin and organize code around:

- `routes`: Fastify route registration.
- `schemas`: Fluent Schema request and response schemas.
- `services`: business workflows.
- `repositories`: Drizzle database access.
- `permissions`: authorization rules.
- `events`: domain events and listeners.
- `tasks`: background jobs and scheduled work.
- `tests`: app-owned tests.
