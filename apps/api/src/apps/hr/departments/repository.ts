import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  ilike,
  inArray,
  isNull,
  lte,
  ne,
  or,
  sql,
  SQL,
} from "drizzle-orm";
import {
  paginatedResponse,
  toBigInt,
  type AssignDepartmentMember,
  type CreateDepartment,
  type DepartmentMembersListQuery,
  type DepartmentsListQuery,
  type UpdateDepartment,
} from "@stanforte/contract";
import { DbService } from "$core/db";
import { TenantContextService } from "$core/auth/tenant-context.service";
import {
  assertDateRange,
  isTrueQueryFlag,
  parseBigIntId,
  parseDateOnly,
  parseOptionalDateOnly,
  todayDateOnly,
} from "$core/utils";
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "$core/errors";
import { department, departmentMember } from "./model";
import { profile } from "$apps/identity/users/model";
import { organization } from "$apps/hr/organizations/model";

/**
 * Departments exist so an approver resolver can answer "who manages the
 * requester's department" and "who is in that department", which the
 * `organization` tree cannot: organizations model legal structure, and a
 * person can sit in several departments at once.
 *
 * Membership rows are historical (`effectiveFrom`/`effectiveTo`), so an approval
 * resolves the manager who was in post when the request was submitted rather
 * than whoever holds the role today.
 */
export class DepartmentsService {
  constructor(
    private readonly db: DbService,
    private readonly tenantContext: TenantContextService,
  ) {}

  /* ---------------------------------------------------------------------- */
  /* Departments                                                             */
  /* ---------------------------------------------------------------------- */

  async list(query: DepartmentsListQuery) {
    const tenantId = this.tenantContext.requireTenantId();
    const page = this.pageOf(query);
    const perPage = this.perPageOf(query);

    const conditions: SQL[] = [eq(department.tenantId, tenantId)];
    if (!isTrueQueryFlag(query.include_inactive))
      conditions.push(eq(department.isActive, true));
    if (query.parent_department_id) {
      conditions.push(
        eq(department.parentDepartmentId, query.parent_department_id),
      );
    }
    if (query.organization_id)
      conditions.push(
        eq(
          department.organizationId,
          parseBigIntId(query.organization_id, "organization id"),
        ),
      );
    if (query.search) {
      const search = `%${query.search.trim()}%`;
      conditions.push(
        or(
          ilike(department.name, search),
          ilike(department.code, search),
        ) as SQL,
      );
    }
    const where = and(...conditions);

    const [rows, totals] = await Promise.all([
      this.db.client
        .select()
        .from(department)
        .where(where)
        .orderBy(asc(department.name))
        .offset((page - 1) * perPage)
        .limit(perPage),
      this.db.client.select({ value: count() }).from(department).where(where),
    ]);

    const items = await Promise.all(rows.map((row) => this.withSummary(row)));
    return paginatedResponse(items, {
      page,
      per_page: perPage,
      total: Number(totals[0]?.value ?? 0),
    });
  }

  async get(id: string) {
    const row = await this.findDepartment(id);
    if (!row) throw new NotFoundException("Department not found");
    return this.withSummary(row, { includeMembers: true });
  }

  /** The whole tree, ordered so a client can render it without sorting. */
  async tree() {
    const tenantId = this.tenantContext.requireTenantId();
    const rows = await this.db.client
      .select()
      .from(department)
      .where(
        and(eq(department.tenantId, tenantId), eq(department.isActive, true)),
      )
      .orderBy(asc(department.name));

    const summaries = new Map<string, any>();
    for (const row of rows)
      summaries.set(row.id, {
        ...(await this.withSummary(row)),
        child_departments: [],
      });

    const roots: any[] = [];
    for (const node of summaries.values()) {
      const parentId = (node as any).parent_department_id;
      const parent = parentId ? summaries.get(parentId) : undefined;
      if (parent) parent.child_departments.push(node);
      else roots.push(node);
    }
    return { success: true, data: roots };
  }

  async create(dto: CreateDepartment, actorId?: string) {
    const tenantId = this.tenantContext.requireTenantId();
    const name = dto.name.trim();
    const code = dto.code.trim();

    if (await this.findDepartmentByCode(code)) {
      throw new ConflictException("Department code already exists");
    }

    const parentDepartmentId = dto.parent_department_id ?? null;
    if (parentDepartmentId)
      await this.assertDepartmentExists(parentDepartmentId);
    if (dto.organization_id)
      await this.assertOrganizationExists(dto.organization_id);

    const [created] = await this.db.client
      .insert(department)
      .values({
        tenantId,
        name,
        code,
        description: dto.description?.trim() || null,
        parentDepartmentId,
        organizationId: dto.organization_id
          ? parseBigIntId(dto.organization_id, "organization id")
          : null,
        isActive: dto.is_active ?? true,
        createdBy: this.actor(actorId),
        updatedBy: this.actor(actorId),
      })
      .returning();

    return this.withSummary(created);
  }

  async update(id: string, dto: UpdateDepartment, actorId?: string) {
    const existing = await this.findDepartment(id);
    if (!existing) throw new NotFoundException("Department not found");

    if (dto.code && dto.code.trim() !== existing.code) {
      const clash = await this.findDepartmentByCode(dto.code.trim());
      if (clash) throw new ConflictException("Department code already exists");
    }

    // A department may not become its own ancestor, otherwise the tree is
    // unreachable and the escalation walk loops forever.
    if (dto.parent_department_id !== undefined) {
      const parentId = dto.parent_department_id ?? null;
      if (parentId === existing.id)
        throw new BadRequestException("A department cannot be its own parent");
      if (parentId) {
        await this.assertDepartmentExists(parentId);
        if (await this.isDescendant(existing.id, parentId)) {
          throw new BadRequestException(
            "Department cannot be moved under its own descendant",
          );
        }
      }
    }
    if (dto.organization_id)
      await this.assertOrganizationExists(dto.organization_id);

    const [updated] = await this.db.client
      .update(department)
      .set({
        name: dto.name?.trim(),
        code: dto.code?.trim(),
        description:
          dto.description === undefined
            ? undefined
            : dto.description?.trim() || null,
        parentDepartmentId:
          dto.parent_department_id === undefined
            ? undefined
            : (dto.parent_department_id ?? null),
        organizationId:
          dto.organization_id === undefined
            ? undefined
            : dto.organization_id
              ? parseBigIntId(dto.organization_id, "organization id")
              : null,
        isActive: dto.is_active,
        updatedBy: this.actor(actorId),
      })
      .where(
        and(
          eq(department.id, existing.id),
          eq(department.tenantId, this.tenantContext.requireTenantId()),
        ),
      )
      .returning();

    return this.withSummary(updated);
  }

  async delete(id: string) {
    const existing = await this.findDepartment(id);
    if (!existing) throw new NotFoundException("Department not found");

    const [children] = await this.db.client
      .select({ value: count() })
      .from(department)
      .where(eq(department.parentDepartmentId, existing.id));
    if (Number(children?.value ?? 0) > 0) {
      throw new ConflictException("Department still has child departments");
    }

    const [members] = await this.db.client
      .select({ value: count() })
      .from(departmentMember)
      .where(
        and(
          eq(departmentMember.departmentId, existing.id),
          isNull(departmentMember.effectiveTo),
        ),
      );
    if (Number(members?.value ?? 0) > 0) {
      throw new ConflictException("Department still has active members");
    }

    await this.db.client
      .delete(department)
      .where(
        and(
          eq(department.id, existing.id),
          eq(department.tenantId, this.tenantContext.requireTenantId()),
        ),
      );

    return { success: true };
  }

  /* ---------------------------------------------------------------------- */
  /* Membership                                                              */
  /* ---------------------------------------------------------------------- */

  async listMembers(departmentId: string, query: DepartmentMembersListQuery) {
    const row = await this.findDepartment(departmentId);
    if (!row) throw new NotFoundException("Department not found");

    const page = this.pageOf(query);
    const perPage = this.perPageOf(query);
    const conditions: SQL[] = [eq(departmentMember.departmentId, row.id)];
    if (isTrueQueryFlag(query.managers_only))
      conditions.push(eq(departmentMember.isManager, true));
    if (!isTrueQueryFlag(query.include_ended))
      conditions.push(isNull(departmentMember.effectiveTo));
    const where = and(...conditions);

    const [rows, totals] = await Promise.all([
      this.db.client
        .select({ member: departmentMember, user: this.profileColumns() })
        .from(departmentMember)
        .leftJoin(profile, eq(departmentMember.profileId, profile.id))
        .where(where)
        .orderBy(
          desc(departmentMember.isManager),
          asc(profile.firstName),
          asc(profile.lastName),
        )
        .offset((page - 1) * perPage)
        .limit(perPage),
      this.db.client
        .select({ value: count() })
        .from(departmentMember)
        .where(where),
    ]);

    return paginatedResponse(
      rows.map(({ member, user }) => this.serializeMember(member, user)),
      {
        page,
        per_page: perPage,
        total: Number(totals[0]?.value ?? 0),
      },
    );
  }

  /**
   * Adds a membership stint. A person already in the department is not
   * duplicated: the existing stint is closed off and a new one opened, so
   * history is never rewritten.
   */
  async assignMember(
    departmentId: string,
    dto: AssignDepartmentMember,
    actorId?: string,
  ) {
    const row = await this.findDepartment(departmentId);
    if (!row) throw new NotFoundException("Department not found");

    const profileId = parseBigIntId(dto.profile_id, "profile id");
    const profileRow = await this.findProfile(profileId);
    if (!profileRow) throw new NotFoundException("Profile not found");

    const effectiveFrom = dto.effective_from?.trim() || todayDateOnly();
    const effectiveFromDate = parseDateOnly(effectiveFrom);
    const effectiveToDate = parseOptionalDateOnly(dto.effective_to);
    assertDateRange(effectiveFromDate, effectiveToDate);

    const [open] = await this.db.client
      .select()
      .from(departmentMember)
      .where(
        and(
          eq(departmentMember.departmentId, row.id),
          eq(departmentMember.profileId, profileId),
          isNull(departmentMember.effectiveTo),
        ),
      )
      .limit(1);

    if (open) {
      throw new ConflictException(
        "Profile is already a member of this department",
      );
    }

    const [created] = await this.db.client
      .insert(departmentMember)
      .values({
        tenantId: this.tenantContext.requireTenantId(),
        departmentId: row.id,
        profileId,
        isManager: dto.is_manager ?? false,
        effectiveFrom: effectiveFromDate,
        effectiveTo: effectiveToDate,
        createdBy: this.actor(actorId),
      })
      .returning();

    return this.serializeMember(created, profileRow);
  }

  async removeMember(departmentId: string, profileId: string) {
    const row = await this.findDepartment(departmentId);
    if (!row) throw new NotFoundException("Department not found");

    const bigProfileId = parseBigIntId(profileId, "profile id");
    const [open] = await this.db.client
      .select()
      .from(departmentMember)
      .where(
        and(
          eq(departmentMember.departmentId, row.id),
          eq(departmentMember.profileId, bigProfileId),
          isNull(departmentMember.effectiveTo),
        ),
      )
      .limit(1);

    if (!open) throw new NotFoundException("Membership not found");

    // End the stint rather than deleting it: approver resolution against a
    // historical request still needs to see who was a member at the time.
    const [ended] = await this.db.client
      .update(departmentMember)
      .set({ effectiveTo: parseDateOnly(todayDateOnly()) })
      .where(eq(departmentMember.id, open.id))
      .returning();

    return this.serializeMember(ended, null);
  }

  /* ---------------------------------------------------------------------- */
  /* Resolver support                                                        */
  /* ---------------------------------------------------------------------- */

  /**
   * Candidate approvers for a profile: the managers of every department the
   * profile currently belongs to. This is the query the workflow approver
   * resolver calls for the `department_manager` strategy, and
   * `listManagerIds` below is what it uses to skip anyone unavailable.
   *
   * `asOf` defaults to today, so an approval submitted while someone was
   * manager resolves to that person, not to their replacement.
   */
  async findManagers(profileId: string | bigint, asOf?: string) {
    const tenantId = this.tenantContext.requireTenantId();
    const pid =
      typeof profileId === "bigint"
        ? profileId
        : parseBigIntId(profileId, "profile id");
    const on = asOf?.trim() || todayDateOnly();
    const asOfDate = parseDateOnly(on);

    const memberships = await this.db.client
      .select({ departmentId: departmentMember.departmentId })
      .from(departmentMember)
      .where(
        and(
          eq(departmentMember.tenantId, tenantId),
          eq(departmentMember.profileId, pid),
          lte(departmentMember.effectiveFrom, asOfDate),
          or(
            isNull(departmentMember.effectiveTo),
            gt(departmentMember.effectiveTo, asOfDate),
          ),
        ),
      );
    const departmentIds = memberships.map((row) => row.departmentId);
    if (!departmentIds.length) return [];

    const rows = await this.db.client
      .select({ member: departmentMember, user: this.profileColumns() })
      .from(departmentMember)
      .innerJoin(profile, eq(departmentMember.profileId, profile.id))
      .where(
        and(
          eq(departmentMember.tenantId, tenantId),
          inArray(departmentMember.departmentId, departmentIds),
          eq(departmentMember.isManager, true),
          // In post on the date in question, and not the requester themselves.
          lte(departmentMember.effectiveFrom, asOfDate),
          or(
            isNull(departmentMember.effectiveTo),
            gt(departmentMember.effectiveTo, asOfDate),
          ),
          ne(departmentMember.profileId, pid),
        ),
      )
      .orderBy(asc(profile.lastName));

    return rows.map(({ member, user }) => ({
      ...this.serializeMember(member, user),
      as_of: on,
    }));
  }

  /* ---------------------------------------------------------------------- */
  /* Internals                                                               */
  /* ---------------------------------------------------------------------- */

  private pageOf(query: { page?: string }) {
    const page = Number(query.page ?? 1);
    return Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;
  }

  private perPageOf(query: { per_page?: string }) {
    const perPage = Number(query.per_page ?? 20);
    if (!Number.isFinite(perPage) || perPage < 1) return 20;
    return Math.min(100, Math.floor(perPage));
  }

  private actor(actorId?: string) {
    if (!actorId) return null;
    try {
      return toBigInt(actorId);
    } catch {
      return null;
    }
  }

  private profileColumns() {
    return {
      id: profile.id,
      email: profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      occupation: profile.occupation,
    };
  }

  private serializeMember(
    member: typeof departmentMember.$inferSelect,
    user: any,
  ) {
    return {
      id: member.id,
      department_id: member.departmentId,
      profile_id: member.profileId.toString(),
      is_manager: member.isManager,
      effective_from: member.effectiveFrom,
      effective_to: member.effectiveTo,
      profile: user?.id
        ? {
            id: user.id.toString(),
            email: user.email,
            first_name: user.firstName,
            last_name: user.lastName,
            occupation: user.occupation,
          }
        : null,
      created_at: member.createdAt,
      updated_at: member.updatedAt,
    };
  }

  private async withSummary(
    row: typeof department.$inferSelect,
    options: { includeMembers?: boolean } = {},
  ) {
    const [totals] = await this.db.client
      .select({
        total: count(),
        // `count()` with a FILTER, so a single pass yields both numbers.
        managers: sql<number>`count(*) filter (where ${departmentMember.isManager})`,
      })
      .from(departmentMember)
      .where(
        and(
          eq(departmentMember.departmentId, row.id),
          isNull(departmentMember.effectiveTo),
        ),
      );

    const memberRows = options.includeMembers
      ? await this.db.client
          .select({ member: departmentMember, user: this.profileColumns() })
          .from(departmentMember)
          .leftJoin(profile, eq(departmentMember.profileId, profile.id))
          .where(
            and(
              eq(departmentMember.departmentId, row.id),
              isNull(departmentMember.effectiveTo),
            ),
          )
          .orderBy(desc(departmentMember.isManager), asc(profile.lastName))
      : [];

    return {
      id: row.id,
      name: row.name,
      code: row.code,
      description: row.description,
      parent_department_id: row.parentDepartmentId,
      organization_id: row.organizationId,
      is_active: row.isActive,
      member_count: Number(totals?.total ?? 0),
      manager_count: Number(totals?.managers ?? 0),
      members: memberRows.map(({ member, user }) =>
        this.serializeMember(member, user),
      ),
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    };
  }

  private async findDepartment(id: string) {
    // The route schema constrains the id to a uuid, so it is passed through.
    const [row] = await this.db.client
      .select()
      .from(department)
      .where(
        and(
          eq(department.id, id),
          eq(department.tenantId, this.tenantContext.requireTenantId()),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  private async findDepartmentByCode(code: string) {
    const [row] = await this.db.client
      .select()
      .from(department)
      .where(
        and(
          eq(department.tenantId, this.tenantContext.requireTenantId()),
          eq(department.code, code),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  private async assertDepartmentExists(id: string) {
    if (!(await this.findDepartment(id)))
      throw new BadRequestException("Parent department not found");
  }

  private async assertOrganizationExists(id: string) {
    const organizationId = parseBigIntId(id, "organization id");
    const [row] = await this.db.client
      .select({ id: organization.id })
      .from(organization)
      .where(
        and(
          eq(organization.id, organizationId),
          eq(organization.tenantId, this.tenantContext.requireTenantId()),
        ),
      )
      .limit(1);
    if (!row) throw new BadRequestException("Organization not found");
  }

  /** Walks up from `candidate` looking for `ancestorId`. */
  private async isDescendant(ancestorId: string, candidate: string) {
    let cursor: string | null = candidate;
    const seen = new Set<string>();

    while (cursor && !seen.has(cursor)) {
      seen.add(cursor);
      if (cursor === ancestorId) return true;
      const [row] = await this.db.client
        .select({ parentDepartmentId: department.parentDepartmentId })
        .from(department)
        .where(eq(department.id, cursor))
        .limit(1);
      cursor = row?.parentDepartmentId ?? null;
    }
    return false;
  }

  private async findProfile(profileId: bigint) {
    const [row] = await this.db.client
      .select(this.profileColumns())
      .from(profile)
      .where(eq(profile.id, profileId))
      .limit(1);
    return row ?? null;
  }
}
