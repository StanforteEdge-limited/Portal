import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AttachFileDto } from './dto/attach-file.dto';
import { Prisma } from '@prisma/client';
import { toBigInt } from '../../common/utils/ids';
import { paginatedResponse } from '../../common/helpers/paginated-response';
import { extname } from 'node:path';

@Injectable()
export class FilesService {
  constructor(private readonly prisma: PrismaService) {}

  private buildPublicUrl(storagePath: string) {
    const base = (process.env.FILE_BASE_URL || process.env.APP_URL || process.env.APP_BASE_URL || '').replace(/\/+$/, '');
    if (!base) return null;
    return `${base}/${storagePath.replace(/^\/+/, '')}`;
  }

  async list(query: Record<string, any>) {
    const page = Math.max(1, Number(query.page ?? 1));
    const perPage = Math.min(100, Math.max(1, Number(query.per_page ?? 20)));

    const where: Prisma.FileAssetWhereInput = {};
    const andConditions: Prisma.FileAssetWhereInput[] = [];

    if (query.organization_id) {
      where.organizationId = toBigInt(String(query.organization_id));
    }
    if (query.uploaded_by) {
      where.uploadedBy = toBigInt(String(query.uploaded_by));
    }
    if (query.request_item_id) {
      where.requestItems = {
        some: { id: String(query.request_item_id) }
      };
    }
    if (query.search) {
      const search = String(query.search).trim();
      if (search) {
        andConditions.push({
          OR: [
          { fileName: { contains: search, mode: 'insensitive' } },
          { storagePath: { contains: search, mode: 'insensitive' } },
          { publicUrl: { contains: search, mode: 'insensitive' } }
          ]
        });
      }
    }
    if (query.mime_type) {
      where.mimeType = { contains: String(query.mime_type), mode: 'insensitive' };
    }
    if (query.file_type) {
      const fileType = String(query.file_type).toLowerCase();
      if (fileType === 'images') where.mimeType = { startsWith: 'image/' };
      if (fileType === 'videos') where.mimeType = { startsWith: 'video/' };
      if (fileType === 'documents') {
        andConditions.push({
          OR: [
            { mimeType: { contains: 'pdf', mode: 'insensitive' } },
            { mimeType: { contains: 'msword', mode: 'insensitive' } },
            { mimeType: { contains: 'officedocument', mode: 'insensitive' } },
            { mimeType: { startsWith: 'text/' } }
          ]
        });
      }
    }
    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.fileAsset.findMany({
        where,
        include: {
          uploader: {
            select: {
              id: true,
              username: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage
      }),
      this.prisma.fileAsset.count({ where })
    ]);

    const withUsage =
      query.include_usage === 'true'
        ? await Promise.all(
            data.map(async (file) => ({
              ...file,
              usage: await this.getUsageSummary(file.id)
            }))
          )
        : data;

    const attachedFilter = query.attached;
    const filteredByAttached =
      query.include_usage === 'true' && (attachedFilter === 'true' || attachedFilter === 'false')
        ? withUsage.filter((row: any) => Boolean(row.usage?.attached) === (attachedFilter === 'true'))
        : withUsage;

    const totalFiltered = filteredByAttached.length;
    return paginatedResponse(filteredByAttached, { page, per_page: perPage, total: totalFiltered });
  }

  async attach(userId: string, dto: AttachFileDto) {
    if (!dto.storage_path && !dto.file_url) {
      throw new BadRequestException('storage_path or file_url is required');
    }

    if (dto.organization_id) {
      const org = await this.prisma.organization.findUnique({
        where: { id: toBigInt(dto.organization_id) },
        select: { id: true }
      });
      if (!org) throw new NotFoundException('Organization not found');
    }

    return this.prisma.fileAsset.create({
      data: {
        storageDisk: dto.storage_disk ?? 'local',
        storagePath: dto.storage_path || dto.file_url!,
        fileName: dto.file_name,
        mimeType: dto.mime_type ?? null,
        fileSize: dto.file_size !== undefined ? BigInt(dto.file_size) : null,
        publicUrl: dto.file_url ?? null,
        organizationId: dto.organization_id ? toBigInt(dto.organization_id) : null,
        uploadedBy: userId ? toBigInt(userId) : null,
        metadata: (dto.metadata ?? null) as Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput
      }
    });
  }

  async createFromUploadedFile(
    userId: string,
    file: {
      filename: string;
      originalname: string;
      mimetype: string;
      size: number;
      path: string;
    },
    payload?: { organization_id?: string; metadata?: Record<string, unknown> }
  ) {
    if (!file?.filename) throw new BadRequestException('file is required');
    if (payload?.organization_id) {
      const org = await this.prisma.organization.findUnique({
        where: { id: toBigInt(payload.organization_id) },
        select: { id: true }
      });
      if (!org) throw new NotFoundException('Organization not found');
    }

    const ext = extname(file.originalname || file.filename).toLowerCase();
    const mimeType = file.mimetype || (ext === '.pdf' ? 'application/pdf' : 'application/octet-stream');
    const storagePath = `uploads/files/${file.filename}`;

    return this.prisma.fileAsset.create({
      data: {
        storageDisk: 'local',
        storagePath,
        fileName: file.originalname || file.filename,
        mimeType,
        fileSize: BigInt(file.size || 0),
        publicUrl: this.buildPublicUrl(storagePath),
        organizationId: payload?.organization_id ? toBigInt(payload.organization_id) : null,
        uploadedBy: userId ? toBigInt(userId) : null,
        metadata: (payload?.metadata ?? { local_path: file.path }) as Prisma.InputJsonValue
      }
    });
  }

  async remove(id: string) {
    const file = await this.prisma.fileAsset.findUnique({
      where: { id },
      select: { id: true, fileName: true, storagePath: true }
    });
    if (!file) throw new NotFoundException('File not found');

    const usage = await this.getUsageSummary(id);
    if (usage.attached) {
      throw new BadRequestException('Cannot delete file because it is attached to request records');
    }

    await this.prisma.fileAsset.delete({ where: { id } });
    return { success: true, id: file.id, file_name: file.fileName };
  }

  async findOne(id: string) {
    const file = await this.prisma.fileAsset.findUnique({
      where: { id },
      select: { id: true, fileName: true, mimeType: true, fileSize: true, storagePath: true, publicUrl: true },
    });
    if (!file) throw new NotFoundException('File not found');
    return {
      id: file.id,
      file_name: file.fileName,
      mime_type: file.mimeType,
      file_size: file.fileSize,
      storage_path: file.storagePath,
      public_url: file.publicUrl,
    };
  }

  async getUsage(id: string) {
    const file = await this.prisma.fileAsset.findUnique({
      where: { id },
      select: { id: true, fileName: true, storagePath: true, publicUrl: true }
    });
    if (!file) throw new NotFoundException('File not found');
    const usage = await this.getUsageSummary(id);
    return { ...file, usage };
  }

  private async getUsageSummary(fileId: string) {
    const [requestItems, vouchers] = await this.prisma.$transaction([
      this.prisma.requestItem.count({ where: { fileId } }),
      this.prisma.financePaymentVoucher.count({ where: { evidenceFileId: fileId } })
    ]);

    const retirementCandidates = await this.prisma.financePaymentVoucher.findMany({
      where: {
        metadata: { not: Prisma.DbNull }
      },
      select: { id: true, voucherNumber: true, metadata: true }
    });
    const retirementVouchers = retirementCandidates
      .filter((row) => {
        if (!row.metadata || typeof row.metadata !== 'object' || Array.isArray(row.metadata)) return false;
        const ids = (row.metadata as Record<string, unknown>).retirement_file_ids;
        return Array.isArray(ids) && ids.some((x) => String(x) === fileId);
      })
      .map((row) => ({ id: row.id, voucher_number: row.voucherNumber }));

    const attached = requestItems > 0 || vouchers > 0 || retirementVouchers.length > 0;

    return {
      attached,
      request_items: requestItems,
      pv_evidence: vouchers,
      retirement_refs: retirementVouchers.length
    };
  }
}
