import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DrizzleService } from '$common/drizzle/drizzle.service';
import { AttachFileDto } from './dto/attach-file.dto';
import { Drizzle } from '$common/db/drizzle-compat';
import { toBigInt } from '$common/utils/ids';
import { paginatedResponse } from '$common/helpers/paginated-response';
import { TenantContextService } from '$common/auth/tenant-context.service';
import { S3StorageService } from './s3-storage.service';
import { extname } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

@Injectable()
export class StorageService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly s3Storage: S3StorageService,
    private readonly tenantContext: TenantContextService
  ) {}

  private buildPublicUrl(storagePath: string) {
    const base = (process.env.FILE_BASE_URL || process.env.APP_URL || process.env.APP_BASE_URL || '').replace(/\/+$/, '');
    if (!base) return null;
    return `${base}/${storagePath.replace(/^\/+/, '')}`;
  }

  private tenantIdValue(): string | undefined {
    const context = this.tenantContext.get();
    if (context && context.scope !== 'system' && context.tenantId !== undefined) {
      return String(context.tenantId);
    }
    return undefined;
  }

  private s3PublicUrl(key: string): string | null {
    const base = String(process.env.S3_PUBLIC_BASE_URL || '').replace(/\/+$/, '');
    if (!base) return null;
    return `${base}/${key.replace(/^\/+/, '')}`;
  }

  async list(query: Record<string, any>) {
    const page = Math.max(1, Number(query.page ?? 1));
    const perPage = Math.min(100, Math.max(1, Number(query.per_page ?? 20)));

    const where: Drizzle.FileAssetWhereInput = {};
    const andConditions: Drizzle.FileAssetWhereInput[] = [];

    if (query.organization_id) {
      where.organizationId = toBigInt(String(query.organization_id));
    }
    if (query.uploaded_by) {
      where.uploadedBy = toBigInt(String(query.uploaded_by));
    }
    if (query.folder_id) {
      const folderFilter = String(query.folder_id).toLowerCase();
      if (folderFilter === 'root' || folderFilter === 'null') {
        where.folderId = null;
      } else {
        where.folderId = toBigInt(String(query.folder_id));
      }
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

    const [data, total] = await this.drizzle.$transaction([
      this.drizzle.fileAsset.findMany({
        where,
        include: {
          uploader: {
            select: {
              id: true,
              username: true,
              email: true
            }
          },
          folder: {
            select: { id: true, name: true, parentId: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage
      }),
      this.drizzle.fileAsset.count({ where })
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

  private async resolveFolderId(folderId?: string): Promise<bigint | null> {
    if (!folderId) return null;
    const folder = await this.drizzle.storageFolder.findUnique({
      where: { id: toBigInt(folderId) },
      select: { id: true }
    });
    if (!folder) throw new NotFoundException('Folder not found');
    return folder.id;
  }

  async attach(userId: string, dto: AttachFileDto) {
    if (!dto.storage_path && !dto.file_url) {
      throw new BadRequestException('storage_path or file_url is required');
    }

    if (dto.organization_id) {
      const org = await this.drizzle.organization.findUnique({
        where: { id: toBigInt(dto.organization_id) },
        select: { id: true }
      });
      if (!org) throw new NotFoundException('Organization not found');
    }

    if (dto.file_size !== undefined) {
      await this.ensureQuota(dto.file_size);
    }

    const folderId = await this.resolveFolderId(dto.folder_id);

    return this.drizzle.fileAsset.create({
      data: {
        storageDisk: dto.storage_disk ?? 'local',
        storagePath: dto.storage_path || dto.file_url!,
        fileName: dto.file_name,
        mimeType: dto.mime_type ?? null,
        fileSize: dto.file_size !== undefined ? BigInt(dto.file_size) : null,
        publicUrl: dto.file_url ?? null,
        organizationId: dto.organization_id ? toBigInt(dto.organization_id) : null,
        folderId,
        uploadedBy: userId ? toBigInt(userId) : null,
        metadata: (dto.metadata ?? null) as Drizzle.InputJsonValue | Drizzle.NullableJsonNullValueInput
      }
    });
  }

  async createFromUploadedFile(
    userId: string,
    file: {
      filename?: string;
      originalname?: string;
      mimetype?: string;
      size?: number;
      buffer?: Buffer;
      path?: string;
    },
    payload?: { organization_id?: string; folder_id?: string; metadata?: Record<string, unknown> }
  ) {
    if (!file?.filename && !file?.originalname) throw new BadRequestException('file is required');
    if (payload?.organization_id) {
      const org = await this.drizzle.organization.findUnique({
        where: { id: toBigInt(payload.organization_id) },
        select: { id: true }
      });
      if (!org) throw new NotFoundException('Organization not found');
    }

    const ext = extname(file.originalname || file.filename || '').toLowerCase();
    const mimeType = file.mimetype || (ext === '.pdf' ? 'application/pdf' : 'application/octet-stream');
    const fileName = file.originalname || file.filename || 'file';
    const fileSize = Number(file.size || (file.buffer ? file.buffer.length : 0) || 0);
    const folderId = await this.resolveFolderId(payload?.folder_id);

    await this.ensureQuota(fileSize);

    if (this.s3Storage.isEnabled) {
      if (!file.buffer) throw new BadRequestException('File buffer is missing');
      const tenantId = this.tenantIdValue();
      const { key } = await this.s3Storage.putBuffer({
        tenantId: tenantId || 'anonymous',
        fileName,
        body: file.buffer,
        contentType: mimeType
      });
      const publicUrl = this.s3PublicUrl(key);
      return this.drizzle.fileAsset.create({
        data: {
          storageDisk: 's3',
          storagePath: key,
          fileName,
          mimeType,
          fileSize: BigInt(fileSize),
          publicUrl: publicUrl ?? null,
          organizationId: payload?.organization_id ? toBigInt(payload.organization_id) : null,
          folderId,
          uploadedBy: userId ? toBigInt(userId) : null,
          metadata: (payload?.metadata ?? { s3_key: key }) as Drizzle.InputJsonValue
        }
      });
    }

    const localName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 200)}`;
    const storagePath = `uploads/files/${localName}`;
    const diskPath = resolve(process.cwd(), storagePath);
    if (file.buffer) {
      mkdirSync(resolve(diskPath, '..'), { recursive: true });
      writeFileSync(diskPath, file.buffer);
    } else if (file.path) {
      const { copyFileSync } = await import('node:fs');
      mkdirSync(resolve(diskPath, '..'), { recursive: true });
      copyFileSync(file.path, diskPath);
    }

    return this.drizzle.fileAsset.create({
      data: {
        storageDisk: 'local',
        storagePath,
        fileName,
        mimeType,
        fileSize: BigInt(fileSize),
        publicUrl: this.buildPublicUrl(storagePath),
        organizationId: payload?.organization_id ? toBigInt(payload.organization_id) : null,
        folderId,
        uploadedBy: userId ? toBigInt(userId) : null,
        metadata: (payload?.metadata ?? { local_path: diskPath }) as Drizzle.InputJsonValue
      }
    });
  }

  /**
   * Persist an artifact produced by a background job (base64 document/export)
   * as a tracked fileAsset in the current tenant. Returns the id + file name.
   */
  async storeGeneratedFile(
    actorId: string | undefined,
    artifact: { file_name?: string; mime_type?: string; content_base64?: string },
  ) {
    if (!artifact?.content_base64) {
      throw new BadRequestException('Generated artifact has no content_base64');
    }
    const file = await this.createFromUploadedFile(actorId ?? '', {
      originalname: artifact.file_name || 'document.pdf',
      mimetype: artifact.mime_type || 'application/pdf',
      buffer: Buffer.from(artifact.content_base64, 'base64'),
    });
    return {
      file_asset_id: file.id,
      file_name: file.fileName,
      mime_type: file.mimeType,
      size: Number(file.fileSize ?? 0n),
    };
  }

  async presignUpload(
    payload: { file_name?: string; mime_type?: string; file_size?: number; expires_in_seconds?: number }
  ) {
    if (!this.s3Storage.isEnabled) {
      throw new BadRequestException('S3 storage is not configured');
    }
    if (!payload?.file_name) throw new BadRequestException('file_name is required');
    if (payload.file_size !== undefined) {
      await this.ensureQuota(payload.file_size);
    }
    const tenantId = this.tenantIdValue();
    const result = await this.s3Storage.presignedUpload({
      tenantId: tenantId || 'anonymous',
      fileName: payload.file_name,
      contentType: payload.mime_type,
      expiresInSeconds: payload.expires_in_seconds
    });
    return { ...result, public_url: this.s3PublicUrl(result.key) };
  }

  async presignDownload(id: string, expiresInSeconds?: number) {
    const file = await this.drizzle.fileAsset.findUnique({
      where: { id },
      select: { id: true, fileName: true, mimeType: true, storageDisk: true, storagePath: true }
    });
    if (!file) throw new NotFoundException('File not found');
    if (this.s3Storage.isEnabled && file.storageDisk === 's3') {
      const url = await this.s3Storage.presignedDownload({
        key: file.storagePath,
        fileName: file.fileName,
        contentType: file.mimeType ?? undefined,
        expiresInSeconds
      });
      return { id: file.id, file_name: file.fileName, presigned_url: url };
    }
    const publicUrl = this.buildPublicUrl(file.storagePath);
    if (!publicUrl) {
      throw new BadRequestException('No downloadable URL is available for this file');
    }
    return { id: file.id, file_name: file.fileName, url: publicUrl };
  }

  async remove(id: string) {
    const file = await this.drizzle.fileAsset.findUnique({
      where: { id },
      select: { id: true, fileName: true, storagePath: true, storageDisk: true }
    });
    if (!file) throw new NotFoundException('File not found');

    const usage = await this.getUsageSummary(id);
    if (usage.attached) {
      throw new BadRequestException('Cannot delete file because it is attached to request records');
    }

    if (this.s3Storage.isEnabled && file.storageDisk === 's3') {
      await this.s3Storage.remove(file.storagePath);
    }

    await this.drizzle.fileAsset.delete({ where: { id } });
    return { success: true, id: file.id, file_name: file.fileName };
  }

  async findOne(id: string) {
    const file = await this.drizzle.fileAsset.findUnique({
      where: { id },
      select: {
        id: true, fileName: true, mimeType: true, fileSize: true, storagePath: true, publicUrl: true, folderId: true,
      },
    });
    if (!file) throw new NotFoundException('File not found');
    return {
      id: file.id,
      file_name: file.fileName,
      mime_type: file.mimeType,
      file_size: file.fileSize,
      storage_path: file.storagePath,
      public_url: file.publicUrl,
      folder_id: file.folderId?.toString() ?? null,
    };
  }

  async getUsage(id: string) {
    const file = await this.drizzle.fileAsset.findUnique({
      where: { id },
      select: { id: true, fileName: true, storagePath: true, publicUrl: true }
    });
    if (!file) throw new NotFoundException('File not found');
    const usage = await this.getUsageSummary(id);
    return { ...file, usage };
  }

  // ── Folders ────────────────────────────────────────────────────────────

  async listFolders(query: Record<string, any> = {}) {
    const where: any = {};
    if (query.parent_id !== undefined && query.parent_id !== '') {
      const parentFilter = String(query.parent_id).toLowerCase();
      if (parentFilter === 'root' || parentFilter === 'null') {
        where.parentId = null;
      } else {
        where.parentId = toBigInt(String(query.parent_id));
      }
    } else {
      where.parentId = null;
    }

    const rows = await this.drizzle.storageFolder.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    const withCounts = await Promise.all(
      rows.map(async (folder) => ({
        id: folder.id.toString(),
        name: folder.name,
        parent_id: folder.parentId?.toString() ?? null,
        created_by: folder.createdBy?.toString() ?? null,
        created_at: folder.createdAt,
        updated_at: folder.updatedAt,
        file_count: await this.drizzle.fileAsset.count({ where: { folderId: folder.id } }),
        child_count: await this.drizzle.storageFolder.count({ where: { parentId: folder.id } }),
      }))
    );
    return withCounts;
  }

  async createFolder(
    userId: string,
    dto: { name?: string; parent_id?: string }
  ) {
    const name = dto.name?.trim();
    if (!name) throw new BadRequestException('Folder name is required');
    const parentId = await this.resolveFolderId(dto.parent_id);

    const existing = await this.drizzle.storageFolder.findFirst({
      where: { name, parentId: parentId ?? null },
      select: { id: true },
    });
    if (existing) throw new BadRequestException('A folder with this name already exists here');

    const folder = await this.drizzle.storageFolder.create({
      data: {
        name,
        parentId,
        createdBy: userId ? toBigInt(userId) : null,
      },
    });
    return {
      id: folder.id.toString(),
      name: folder.name,
      parent_id: folder.parentId?.toString() ?? null,
      created_at: folder.createdAt,
    };
  }

  async renameFolder(id: string, dto: { name?: string }) {
    const name = dto.name?.trim();
    if (!name) throw new BadRequestException('Folder name is required');
    const folder = await this.drizzle.storageFolder.findUnique({
      where: { id: toBigInt(id) },
      select: { id: true, name: true, parentId: true },
    });
    if (!folder) throw new NotFoundException('Folder not found');

    const duplicate = await this.drizzle.storageFolder.findFirst({
      where: { name, parentId: folder.parentId ?? null, id: { not: folder.id } },
      select: { id: true },
    });
    if (duplicate) throw new BadRequestException('A folder with this name already exists here');

    await this.drizzle.storageFolder.update({
      where: { id: folder.id },
      data: { name },
    });
    return { success: true, id: folder.id.toString(), name };
  }

  async deleteFolder(id: string) {
    const folder = await this.drizzle.storageFolder.findUnique({
      where: { id: toBigInt(id) },
      select: { id: true },
    });
    if (!folder) throw new NotFoundException('Folder not found');

    const [fileCount, childCount] = await this.drizzle.$transaction([
      this.drizzle.fileAsset.count({ where: { folderId: folder.id } }),
      this.drizzle.storageFolder.count({ where: { parentId: folder.id } }),
    ]);
    if (fileCount > 0 || childCount > 0) {
      throw new BadRequestException('Folder is not empty; move or delete its contents first');
    }

    await this.drizzle.storageFolder.delete({ where: { id: folder.id } });
    return { success: true, id: folder.id.toString() };
  }

  // ── Quota (based on the tenant's subscription plan) ───────────────────

  async currentUsageBytes(): Promise<number> {
    const result: any = await this.drizzle.fileAsset.aggregate({ _sum: { fileSize: true } });
    const raw = result?._sum?.fileSize;
    return raw == null ? 0 : Math.max(0, Number(raw));
  }

  async quotaInfo(): Promise<{ quotaBytes: number; planCode?: string; planName?: string }> {
    const context = this.tenantContext.get();
    const tenantId = context && context.scope !== 'system' ? context.tenantId : undefined;
    if (!tenantId) return { quotaBytes: 0 };

    const subscription = await this.drizzle.tenantSubscription.findFirst({
      where: { status: 'active' },
      select: { planId: true },
    });
    if (!subscription) return { quotaBytes: 0 };

    const plan = await this.drizzle.subscriptionPlan.findUnique({
      where: { id: subscription.planId },
      select: { code: true, name: true, limits: true },
    });
    const storageGb = Number((plan?.limits as any)?.storage_gb ?? 0);
    return {
      quotaBytes: storageGb > 0 ? Math.floor(storageGb * 1024 * 1024 * 1024) : 0,
      planCode: plan?.code ?? undefined,
      planName: plan?.name ?? undefined,
    };
  }

  async ensureQuota(incomingBytes: number): Promise<void> {
    const { quotaBytes, planName } = await this.quotaInfo();
    if (quotaBytes <= 0) return; // unlimited
    const usage = await this.currentUsageBytes();
    if (usage + incomingBytes > quotaBytes) {
      throw new BadRequestException(
        planName ? `Storage quota exceeded for the ${planName} plan` : 'Storage quota exceeded for your current plan'
      );
    }
  }

  async quota() {
    const usage = await this.currentUsageBytes();
    const { quotaBytes, planCode, planName } = await this.quotaInfo();
    return {
      plan_code: planCode ?? null,
      plan_name: planName ?? null,
      quota_bytes: quotaBytes,
      used_bytes: usage,
      remaining_bytes: quotaBytes > 0 ? Math.max(0, quotaBytes - usage) : null,
      unlimited: quotaBytes <= 0,
    };
  }

  private async getUsageSummary(fileId: string) {
    const [requestItems, vouchers] = await this.drizzle.$transaction([
      this.drizzle.requestItem.count({ where: { fileId } }),
      this.drizzle.financePaymentVoucher.count({ where: { evidenceFileId: fileId } })
    ]);

    const retirementCandidates = await this.drizzle.financePaymentVoucher.findMany({
      where: {
        metadata: { not: Drizzle.DbNull }
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