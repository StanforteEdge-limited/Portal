-- CreateTable
CREATE TABLE "sta_projects" (
    "id" BIGSERIAL NOT NULL,
    "organization_id" BIGINT,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" BIGINT,
    "updated_by" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sta_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_project_governance" (
    "id" BIGSERIAL NOT NULL,
    "project_id" BIGINT NOT NULL,
    "project_code" VARCHAR(50),
    "owner_user_id" BIGINT,
    "start_date" DATE,
    "end_date" DATE,
    "governance_status" VARCHAR(30) NOT NULL DEFAULT 'planned',
    "metadata" JSONB,

    CONSTRAINT "sta_project_governance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sta_project_members" (
    "id" BIGSERIAL NOT NULL,
    "project_id" BIGINT NOT NULL,
    "user_id" BIGINT NOT NULL,
    "role" "GroupUserRole" NOT NULL DEFAULT 'member',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "added_by" BIGINT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "sta_project_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sta_projects_organization_id_idx" ON "sta_projects"("organization_id");

-- CreateIndex
CREATE INDEX "sta_projects_is_active_idx" ON "sta_projects"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "sta_project_governance_project_id_key" ON "sta_project_governance"("project_id");

-- CreateIndex
CREATE INDEX "sta_project_governance_owner_user_id_idx" ON "sta_project_governance"("owner_user_id");

-- CreateIndex
CREATE INDEX "sta_project_governance_governance_status_idx" ON "sta_project_governance"("governance_status");

-- CreateIndex
CREATE INDEX "sta_project_members_user_id_idx" ON "sta_project_members"("user_id");

-- CreateIndex
CREATE INDEX "sta_project_members_role_idx" ON "sta_project_members"("role");

-- CreateIndex
CREATE UNIQUE INDEX "sta_project_members_project_id_user_id_key" ON "sta_project_members"("project_id", "user_id");

-- AddForeignKey
ALTER TABLE "sta_projects" ADD CONSTRAINT "sta_projects_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "sta_organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_project_governance" ADD CONSTRAINT "sta_project_governance_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "sta_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_project_members" ADD CONSTRAINT "sta_project_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "sta_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sta_project_members" ADD CONSTRAINT "sta_project_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "sta_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Copy existing project rows from sta_groups into sta_projects
INSERT INTO sta_projects (id, organization_id, name, description, is_active, created_by, updated_by, created_at, updated_at)
SELECT id, organization_id, name, description, is_active, created_by, updated_by, created_at, updated_at
FROM sta_groups
WHERE lower(type) = 'project'
ON CONFLICT (id) DO NOTHING;

-- Copy governance metadata into sta_project_governance
INSERT INTO sta_project_governance (project_id, project_code, owner_user_id, start_date, end_date, governance_status, metadata)
SELECT
  g.id,
  g.metadata->>'project_code',
  NULLIF(g.metadata->>'owner_user_id', '')::bigint,
  NULLIF(g.metadata->>'start_date', '')::date,
  NULLIF(g.metadata->>'end_date', '')::date,
  COALESCE(g.metadata->>'governance_status', CASE WHEN g.is_active THEN 'active' ELSE 'archived' END),
  g.metadata
FROM sta_groups g
WHERE lower(g.type) = 'project'
ON CONFLICT (project_id) DO NOTHING;

-- Copy project memberships from sta_group_users into sta_project_members
INSERT INTO sta_project_members (project_id, user_id, role, joined_at, added_by, is_primary)
SELECT gu.group_id, gu.user_id, gu.role, gu.joined_at, gu.added_by, gu.is_primary
FROM sta_group_users gu
JOIN sta_groups g ON g.id = gu.group_id
WHERE lower(g.type) = 'project'
ON CONFLICT (project_id, user_id) DO NOTHING;

-- Advance the project id sequence after backfilling explicit ids
SELECT setval(
  pg_get_serial_sequence('sta_projects', 'id'),
  COALESCE((SELECT MAX(id) FROM sta_projects), 1),
  true
);
