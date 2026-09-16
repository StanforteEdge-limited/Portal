import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SQL, and, count, desc, eq } from 'drizzle-orm';
import { DbService } from '$common/db/db.service';
import { TenantContextService } from '$common/auth/tenant-context.service';
import { parseBigIntId, toBigInt } from '$common/utils/ids';
import { CreateAcknowledgementDto } from '$modules/requests/acknowledgements/dto/create-acknowledgement.dto';
import { ListAcknowledgementsDto } from '$modules/requests/acknowledgements/dto/list-acknowledgements.dto';
import { RevokeAcknowledgementDto } from '$modules/requests/acknowledgements/dto/revoke-acknowledgement.dto';
import { paginatedResponse } from '$common/helpers/paginated-response';
import { acknowledgement, NewAcknowledgement } from './model';
import { profile } from '$modules/identity/users/model';
import { formSubmission } from '$modules/requests/forms/model';

@Injectable()
export class AcknowledgementsService {
  constructor(
    private readonly db: DbService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async listMine(profileId: string, query: ListAcknowledgementsDto) {
    return this.listInternal({ ...query, user_id: profileId }, false);
  }

  async listAll(query: ListAcknowledgementsDto) {
    return this.listInternal(query, true);
  }

  async acknowledge(profileId: string, dto: CreateAcknowledgementDto) {
    const userId = parseBigIntId(profileId, 'profile id');
    const subjectType = dto.subject_type.trim().toLowerCase();
    const subjectId = dto.subject_id.trim();
    const version = (dto.version ?? 'current').trim();

    if (!subjectType || !subjectId) {
      throw new BadRequestException('subject_type and subject_id are required');
    }

    const existing = await this.findAcknowledgement([
      eq(acknowledgement.userId, userId),
      eq(acknowledgement.subjectType, subjectType),
      eq(acknowledgement.subjectId, subjectId),
      eq(acknowledgement.version, version),
    ]);

    if (dto.source_form_submission_id) {
      const [source] = await this.db.client
        .select({ id: formSubmission.id })
        .from(formSubmission)
        .where(eq(formSubmission.id, dto.source_form_submission_id))
        .limit(1);
      if (!source) throw new NotFoundException('Source form submission not found');
    }

    const data: NewAcknowledgement = {
      tenantId: this.tenantContext.currentTenantId(),
      userId,
      subjectType,
      subjectId,
      subjectLabel: dto.subject_label?.trim() || null,
      version,
      status: 'acknowledged',
      acknowledgedAt: new Date(),
      revokedAt: null,
      sourceFormSubmissionId: dto.source_form_submission_id || null,
      metadata: dto.metadata ?? null,
    };

    const [row] = existing
      ? await this.db.client
          .update(acknowledgement)
          .set({ ...data, updatedAt: new Date() })
          .where(and(eq(acknowledgement.id, existing.id), ...this.acknowledgementConditions()))
          .returning()
      : await this.db.client.insert(acknowledgement).values(data).returning();

    return this.getById(row.id);
  }

  async revoke(id: string, dto: RevokeAcknowledgementDto) {
    const existing = await this.findAcknowledgement([eq(acknowledgement.id, id)]);
    if (!existing) throw new NotFoundException('Acknowledgement not found');

    const metadata =
      existing.metadata && typeof existing.metadata === 'object' && !Array.isArray(existing.metadata)
        ? { ...(existing.metadata as Record<string, unknown>) }
        : {};

    if (dto.reason?.trim()) {
      metadata.revocation_reason = dto.reason.trim();
    }

    await this.db.client
      .update(acknowledgement)
      .set({
        status: 'revoked',
        revokedAt: new Date(),
        metadata,
      })
      .where(and(eq(acknowledgement.id, id), ...this.acknowledgementConditions()));

    return this.getById(id);
  }

  async getById(id: string) {
    const row = await this.findAcknowledgementWithDetails([eq(acknowledgement.id, id)]);

    if (!row) throw new NotFoundException('Acknowledgement not found');
    return this.serialize(row);
  }

  private async listInternal(query: ListAcknowledgementsDto, allowUserFilter: boolean) {
    const page = Math.max(1, Number(query.page ?? 1));
    const perPage = Math.min(100, Math.max(1, Number(query.per_page ?? 20)));

    const conditions = this.acknowledgementConditions();

    if (query.subject_type) conditions.push(eq(acknowledgement.subjectType, String(query.subject_type).toLowerCase()));
    if (query.subject_id) conditions.push(eq(acknowledgement.subjectId, String(query.subject_id)));
    if (query.status) conditions.push(eq(acknowledgement.status, String(query.status).toLowerCase()));

    if (query.user_id) {
      if (!allowUserFilter) {
        conditions.push(eq(acknowledgement.userId, parseBigIntId(String(query.user_id), 'user_id')));
      } else {
        conditions.push(eq(acknowledgement.userId, parseBigIntId(String(query.user_id), 'user_id')));
      }
    }
    const where = and(...conditions);

    const [rows, totalRows] = await Promise.all([
      this.db.client
        .select({
          row: acknowledgement,
          user: {
            id: profile.id,
            email: profile.email,
            username: profile.username,
            firstName: profile.firstName,
            lastName: profile.lastName,
          },
          sourceSubmission: {
            id: formSubmission.id,
            submissionNumber: formSubmission.submissionNumber,
            status: formSubmission.status,
          },
        })
        .from(acknowledgement)
        .leftJoin(profile, eq(acknowledgement.userId, profile.id))
        .leftJoin(formSubmission, eq(acknowledgement.sourceFormSubmissionId, formSubmission.id))
        .where(where)
        .orderBy(desc(acknowledgement.acknowledgedAt), desc(acknowledgement.createdAt))
        .offset((page - 1) * perPage)
        .limit(perPage),
      this.db.client.select({ value: count() }).from(acknowledgement).where(where),
    ]);
    const data = rows.map(({ row, user, sourceSubmission }) => ({ ...row, user, sourceSubmission }));

    return paginatedResponse(data.map((row) => this.serialize(row)), {
      page,
      per_page: perPage,
      total: Number(totalRows[0]?.value ?? 0),
    });
  }

  private serialize(row: any) {
    return {
      id: row.id,
      user_id: row.userId.toString(),
      user: row.user
        ? {
            id: row.user.id.toString(),
            email: row.user.email,
            username: row.user.username,
            first_name: row.user.firstName,
            last_name: row.user.lastName
          }
        : null,
      subject_type: row.subjectType,
      subject_id: row.subjectId,
      subject_label: row.subjectLabel,
      version: row.version,
      status: row.status,
      acknowledged_at: row.acknowledgedAt,
      revoked_at: row.revokedAt,
      source_form_submission: row.sourceSubmission
        ? {
            id: row.sourceSubmission.id,
            submission_number: row.sourceSubmission.submissionNumber,
            status: row.sourceSubmission.status
          }
        : null,
      metadata: row.metadata,
      created_at: row.createdAt,
      updated_at: row.updatedAt
    };
  }

  private acknowledgementConditions(): SQL[] {
    const tenantId = this.tenantContext.currentTenantId();
    return tenantId ? [eq(acknowledgement.tenantId, tenantId)] : [];
  }

  private async findAcknowledgement(conditions: SQL[]) {
    const [row] = await this.db.client
      .select()
      .from(acknowledgement)
      .where(and(...this.acknowledgementConditions(), ...conditions))
      .limit(1);
    return row ?? null;
  }

  private async findAcknowledgementWithDetails(conditions: SQL[]) {
    const [row] = await this.db.client
      .select({
        row: acknowledgement,
        user: {
          id: profile.id,
          email: profile.email,
          username: profile.username,
          firstName: profile.firstName,
          lastName: profile.lastName,
        },
        sourceSubmission: {
          id: formSubmission.id,
          submissionNumber: formSubmission.submissionNumber,
          status: formSubmission.status,
        },
      })
      .from(acknowledgement)
      .leftJoin(profile, eq(acknowledgement.userId, profile.id))
      .leftJoin(formSubmission, eq(acknowledgement.sourceFormSubmissionId, formSubmission.id))
      .where(and(...this.acknowledgementConditions(), ...conditions))
      .limit(1);

    return row ? { ...row.row, user: row.user, sourceSubmission: row.sourceSubmission } : null;
  }
}
