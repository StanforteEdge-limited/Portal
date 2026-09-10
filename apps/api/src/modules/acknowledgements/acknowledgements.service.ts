import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { toBigInt } from '../../common/utils/ids';
import { CreateAcknowledgementDto } from './dto/create-acknowledgement.dto';
import { ListAcknowledgementsDto } from './dto/list-acknowledgements.dto';
import { RevokeAcknowledgementDto } from './dto/revoke-acknowledgement.dto';
import { paginatedResponse } from '../../common/helpers/paginated-response';

@Injectable()
export class AcknowledgementsService {
  constructor(private readonly prisma: PrismaService) {}

  async listMine(profileId: string, query: ListAcknowledgementsDto) {
    return this.listInternal({ ...query, user_id: profileId }, false);
  }

  async listAll(query: ListAcknowledgementsDto) {
    return this.listInternal(query, true);
  }

  async acknowledge(profileId: string, dto: CreateAcknowledgementDto) {
    const userId = this.parseId(profileId, 'profile id');
    const subjectType = dto.subject_type.trim().toLowerCase();
    const subjectId = dto.subject_id.trim();
    const version = (dto.version ?? 'current').trim();

    if (!subjectType || !subjectId) {
      throw new BadRequestException('subject_type and subject_id are required');
    }

    const existing = await this.prisma.acknowledgement.findFirst({
      where: {
        userId,
        subjectType,
        subjectId,
        version
      }
    });

    if (dto.source_form_submission_id) {
      const source = await this.prisma.formSubmission.findUnique({
        where: { id: dto.source_form_submission_id },
        select: { id: true }
      });
      if (!source) throw new NotFoundException('Source form submission not found');
    }

    const data: Prisma.AcknowledgementUncheckedCreateInput = {
      userId,
      subjectType,
      subjectId,
      subjectLabel: dto.subject_label?.trim() || null,
      version,
      status: 'acknowledged',
      acknowledgedAt: new Date(),
      revokedAt: null,
      sourceFormSubmissionId: dto.source_form_submission_id || null,
      metadata: (dto.metadata ?? null) as Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput
    };

    const row = existing
      ? await this.prisma.acknowledgement.update({
          where: { id: existing.id },
          data: {
            ...data,
            updatedAt: new Date()
          }
        })
      : await this.prisma.acknowledgement.create({ data });

    return this.getById(row.id);
  }

  async revoke(id: string, dto: RevokeAcknowledgementDto) {
    const existing = await this.prisma.acknowledgement.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Acknowledgement not found');

    const metadata =
      existing.metadata && typeof existing.metadata === 'object' && !Array.isArray(existing.metadata)
        ? { ...(existing.metadata as Record<string, unknown>) }
        : {};

    if (dto.reason?.trim()) {
      metadata.revocation_reason = dto.reason.trim();
    }

    await this.prisma.acknowledgement.update({
      where: { id },
      data: {
        status: 'revoked',
        revokedAt: new Date(),
        metadata: metadata as Prisma.InputJsonValue
      }
    });

    return this.getById(id);
  }

  async getById(id: string) {
    const row = await this.prisma.acknowledgement.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true
          }
        },
        sourceSubmission: {
          select: {
            id: true,
            submissionNumber: true,
            status: true
          }
        }
      }
    });

    if (!row) throw new NotFoundException('Acknowledgement not found');
    return this.serialize(row);
  }

  private async listInternal(query: ListAcknowledgementsDto, allowUserFilter: boolean) {
    const page = Math.max(1, Number(query.page ?? 1));
    const perPage = Math.min(100, Math.max(1, Number(query.per_page ?? 20)));

    const where: Prisma.AcknowledgementWhereInput = {};

    if (query.subject_type) where.subjectType = String(query.subject_type).toLowerCase();
    if (query.subject_id) where.subjectId = String(query.subject_id);
    if (query.status) where.status = String(query.status).toLowerCase();

    if (query.user_id) {
      if (!allowUserFilter) {
        where.userId = this.parseId(String(query.user_id), 'user_id');
      } else {
        where.userId = this.parseId(String(query.user_id), 'user_id');
      }
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.acknowledgement.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true,
              firstName: true,
              lastName: true
            }
          },
          sourceSubmission: {
            select: {
              id: true,
              submissionNumber: true,
              status: true
            }
          }
        },
        orderBy: [{ acknowledgedAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * perPage,
        take: perPage
      }),
      this.prisma.acknowledgement.count({ where })
    ]);

    return paginatedResponse(rows.map((row) => this.serialize(row)), { page, per_page: perPage, total });
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

  private parseId(value: string, label: string): bigint {
    try {
      return toBigInt(value);
    } catch {
      throw new BadRequestException(`Invalid ${label}`);
    }
  }
}
