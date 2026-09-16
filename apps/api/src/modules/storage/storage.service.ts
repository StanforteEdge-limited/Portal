import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SQL, and, asc, count, desc, eq, exists, ilike, isNotNull, isNull, like, ne, or, sql } from 'drizzle-orm';
import { DbService } from '$common/db/db.service';
import { TenantContextService } from '$common/auth/tenant-context.service';
import { toBigInt } from '$common/utils/ids';
import { paginatedResponse } from '$common/helpers/paginated-response';
import { AttachFileDto } from './dto/attach-file.dto';
import { S3StorageService } from './s3-storage.service';
import { fileAsset, storageFolder } from './model';
import { profile } from '$modules/identity/users/model';
import { organization } from '$modules/directory/organizations/model';
import { tenantOrganization } from '$modules/tenancy/model';
import { requestItem } from '$modules/requests/requests/model';
import { financePaymentVoucher } from '$modules/finance/finance/model';
import { subscriptionPlan, tenantSubscription } from '$modules/platform/billing/model';
import { extname } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

@Injectable()
export class StorageService {
  constructor(
    private readonly db: DbService,
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

  private fileAssetConditions(): SQL[] {
    const tenantId = this.tenantContext.currentTenantId();
    return tenantId ? [eq(fileAsset.tenantId, tenantId)] : [];
  }

  private storageFolderConditions(): SQL[] {
    const tenantId = this.tenantContext.currentTenantId();
    return tenantId ? [eq(storageFolder.tenantId, tenantId)] : [];
  }

  async list(query: Record<string, any>) {
    const page = Math.max(1, Number(query.page ?? 1));
    const perPage = Math.min(100, Math.max(1, Number(query.per_page ?? 20)));

    const conditions: SQL[] = this.fileAssetConditions();

    if (query.organization_id) {
      conditions.push(eq(fileAsset.organizationId, toBigInt(String(query.organization_id))));
    }
    if (query.uploaded_by) {
      conditions.push(eq(fileAsset.uploadedBy, toBigInt(String(query.uploaded_by))));
    }
    if (query.folder_id) {
      const folderFilter = String(query.folder_id).toLowerCase();
      if (folderFilter === 'root' || folderFilter === 'null') {
        conditions.push(isNull(fileAsset.folderId));
      } else {
        conditions.push(eq(fileAsset.folderId, toBigInt(String(query.folder_id))));
      }
    }
    if (query.request_item_id) {
      const requestItemId = String(query.request_item_id);
      conditions.push(
        exists(
          this.db.client
            .select({ id: requestItem.id })
            .from(requestItem)
            .where(and(eq(requestItem.id, requestItemId), eq(requestItem.fileId, fileAsset.id)))
        )
      );
    }
    if (query.search) {
      const search = String(query.search).trim();
      if (search) {
        const pattern = `%${search}%`;
        conditions.push(
          or(ilike(fileAsset.fileName, pattern), ilike(fileAsset.storagePath, pattern), ilike(fileAsset.publicUrl, pattern))!
        );
      }
    }
    if (query.mime_type) {
      conditions.push(ilike(fileAsset.mimeType, `%${String(query.mime_type)}%`));
    }
    if (query.file_type) {
      const fileType = String(query.file_type).toLowerCase();
      if (fileType === 'images') conditions.push(like(fileAsset.mimeType, 'image/%'));
      if (fileType === 'videos') conditions.push(like(fileAsset.mimeType, 'video/%'));
      if (fileType === 'documents') {
        conditions.push(
          or(
            ilike(fileAsset.mimeType, '%pdf%'),
            ilike(fileAsset.mimeType, '%msword%'),
            ilike(fileAsset.mimeType, '%officedocument%'),
            like(fileAsset.mimeType, 'text/%')
          )!
        );
      }
    }
    const where = conditions.length ? and(...conditions) : undefined;

    const [data, totalRows] = await Promise.all([
      this.db.client
        .select({ file: fileAsset, uploader: profile, folder: storageFolder })
        .from(fileAsset)
        .leftJoin(profile, eq(fileAsset.uploadedBy, profile.id))
        .leftJoin(storageFolder, eq(fileAsset.folderId, storageFolder.id))
        .where(where)
        .orderBy(desc(fileAsset.createdAt))
        .offset((page - 1) * perPage)
        .limit(perPage),
      this.db.client.select({ value: count() }).from(fileAsset).where(where),
    ]);

    const dataRows = data.map(({ file, uploader, folder }) => ({
      ...file,
      uploader: uploader ? { id: uploader.id, username: uploader.username, email: uploader.email } : null,
      folder: folder ? { id: folder.id, name: folder.name, parentId: folder.parentId } : null,
    }));

    const withUsage =
      query.include_usage === 'true'
        ? await Promise.all(
            dataRows.map(async (file) => ({
              ...file,
              usage: await this.getUsageSummary(file.id)
            }))
          )
        : dataRows;

    const attachedFilter = query.attached;
    const filteredByAttached =
      query.include_usage === 'true' && (attachedFilter === 'true' || attachedFilter === 'false')
        ? withUsage.filter((row: any) => Boolean(row.usage?.attached) === (attachedFilter === 'true'))
        : withUsage;

    const totalFiltered = filteredByAttached.length;
    return paginatedResponse(filteredByAttached, { page, per_page: perPage, total: totalFiltered });
  }

  private async findFileAssetById(id: string) {
    const [row] = await this.db.client
      .select()
      .from(fileAsset)
      .where(and(eq(fileAsset.id, id), ...this.fileAssetConditions()))
      .limit(1);
    return row ?? null;
  }

  private async resolveFolderId(folderId?: string): Promise<bigint | null> {
    if (!folderId) return null;
    const [folder] = await this.db.client
      .select({ id: storageFolder.id })
      .from(storageFolder)
      .where(and(eq(storageFolder.id, toBigInt(folderId)), ...this.storageFolderConditions()))
      .limit(1);
    if (!folder) throw new NotFoundException('Folder not found');
    return folder.id;
  }

  private async ensureOrganizationExists(organizationId: bigint) {
    const conditions: SQL[] = [eq(organization.id, organizationId)];
    const tenantId = this.tenantContext.currentTenantId();
    if (tenantId) {
      conditions.push(
        exists(
          this.db.client
            .select({ id: tenantOrganization.organizationId })
            .from(tenantOrganization)
            .where(eq(tenantOrganization.tenantId, tenantId))
        )
      );
    }
    const [org] = await this.db.client
      .select({ id: organization.id })
      .from(organization)
      .where(and(...conditions))
      .limit(1);
    if (!org) throw new NotFoundException('Organization not found');
  }

  private async currentRequiredTenantId() {
    const tenantId = this.tenantContext.currentTenantId();
    if (!tenantId) throw new BadRequestException('Tenant context is required to upload files');
    return tenantId;
  }

  async attach(userId: string, dto: AttachFileDto) {
    if (!dto.storage_path && !dto.file_url) {
      throw new BadRequestException('storage_path or file_url is required');
    }

    if (dto.organization_id) {
      await this.ensureOrganizationExists(toBigInt(dto.organization_id));
    }

    if (dto.file_size !== undefined) {
      await this.ensureQuota(dto.file_size);
    }

    const folderId = await this.resolveFolderId(dto.folder_id);
    const tenantId = await this.currentRequiredTenantId();

    const [created] = await this.db.client
      .insert(fileAsset)
      .values({
        tenantId,
        storageDisk: dto.storage_disk ?? 'local',
        storagePath: dto.storage_path || dto.file_url!,
        fileName: dto.file_name,
        mimeType: dto.mime_type ?? null,
        fileSize: dto.file_size !== undefined ? BigInt(dto.file_size) : null,
        publicUrl: dto.file_url ?? null,
        organizationId: dto.organization_id ? toBigInt(dto.organization_id) : null,
        folderId,
        uploadedBy: userId ? toBigInt(userId) : null,
        metadata: dto.metadata ?? null
      })
      .returning();
    return created;
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
      await this.ensureOrganizationExists(toBigInt(payload.organization_id));
    }

    const ext = extname(file.originalname || file.filename || '').toLowerCase();
    const mimeType = file.mimetype || (ext === '.pdf' ? 'application/pdf' : 'application/octet-stream');
    const fileName = file.originalname || file.filename || 'file';
    const fileSize = Number(file.size || (file.buffer ? file.buffer.length : 0) || 0);
    const folderId = await this.resolveFolderId(payload?.folder_id);
    const tenantId = await this.currentRequiredTenantId();

    await this.ensureQuota(fileSize);

    if (this.s3Storage.isEnabled) {
      if (!file.buffer) throw new BadRequestException('File buffer is missing');
      const tenantKey = this.tenantIdValue();
      const { key } = await this.s3Storage.putBuffer({
        tenantId: tenantKey || 'anonymous',
        fileName,
        body: file.buffer,
        contentType: mimeType
      });
      const publicUrl = this.s3PublicUrl(key);
      const [created] = await this.db.client
        .insert(fileAsset)
        .values({
          tenantId,
          storageDisk: 's3',
          storagePath: key,
          fileName,
          mimeType,
          fileSize: BigInt(fileSize),
          publicUrl: publicUrl ?? null,
          organizationId: payload?.organization_id ? toBigInt(payload.organization_id) : null,
          folderId,
          uploadedBy: userId ? toBigInt(userId) : null,
          metadata: payload?.metadata ?? { s3_key: key }
        })
        .returning();
      return created;
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

    const [created] = await this.db.client
      .insert(fileAsset)
      .values({
        tenantId,
        storageDisk: 'local',
        storagePath,
        fileName,
        mimeType,
        fileSize: BigInt(fileSize),
        publicUrl: this.buildPublicUrl(storagePath),
        organizationId: payload?.organization_id ? toBigInt(payload.organization_id) : null,
        folderId,
        uploadedBy: userId ? toBigInt(userId) : null,
        metadata: payload?.metadata ?? { local_path: diskPath }
      })
      .returning();
    return created;
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
    const file = await this.findFileAssetById(id);
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
    const file = await this.findFileAssetById(id);
    if (!file) throw new NotFoundException('File not found');

    const usage = await this.getUsageSummary(id);
    if (usage.attached) {
      throw new BadRequestException('Cannot delete file because it is attached to request records');
    }

    if (this.s3Storage.isEnabled && file.storageDisk === 's3') {
      await this.s3Storage.remove(file.storagePath);
    }

    await this.db.client.delete(fileAsset).where(and(eq(fileAsset.id, id), ...this.fileAssetConditions()));
    return { success: true, id: file.id, file_name: file.fileName };
  }

  async findOne(id: string) {
    const file = await this.findFileAssetById(id);
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
    const file = await this.findFileAssetById(id);
    if (!file) throw new NotFoundException('File not found');
    const usage = await this.getUsageSummary(id);
    return {
      id: file.id,
      fileName: file.fileName,
      storagePath: file.storagePath,
      publicUrl: file.publicUrl,
      usage,
    };
  }

  // ── Folders ────────────────────────────────────────────────────────────

  async listFolders(query: Record<string, any> = {}) {
    const conditions: SQL[] = this.storageFolderConditions();
    if (query.parent_id !== undefined && query.parent_id !== '') {
      const parentFilter = String(query.parent_id).toLowerCase();
      if (parentFilter === 'root' || parentFilter === 'null') {
        conditions.push(isNull(storageFolder.parentId));
      } else {
        conditions.push(eq(storageFolder.parentId, toBigInt(String(query.parent_id))));
      }
    } else {
      conditions.push(isNull(storageFolder.parentId));
    }

    const folders = await this.db.client
      .select()
      .from(storageFolder)
      .where(and(...conditions))
      .orderBy(asc(storageFolder.name));

    const withCounts = await Promise.all(
      folders.map(async (folder) => {
        const [fileCountRows, childCountRows] = await Promise.all([
          this.db.client
            .select({ value: count() })
            .from(fileAsset)
            .where(and(eq(fileAsset.folderId, folder.id), ...this.fileAssetConditions())),
          this.db.client
            .select({ value: count() })
            .from(storageFolder)
            .where(and(eq(storageFolder.parentId, folder.id), ...this.storageFolderConditions())),
        ]);
        return {
          id: folder.id.toString(),
          name: folder.name,
          parent_id: folder.parentId?.toString() ?? null,
          created_by: folder.createdBy?.toString() ?? null,
          created_at: folder.createdAt,
          updated_at: folder.updatedAt,
          file_count: Number(fileCountRows[0]?.value ?? 0),
          child_count: Number(childCountRows[0]?.value ?? 0),
        };
      })
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
    const tenantId = await this.currentRequiredTenantId();

    const existing = await this.db.client
      .select({ id: storageFolder.id })
      .from(storageFolder)
      .where(and(
        eq(storageFolder.tenantId, tenantId),
        eq(storageFolder.name, name),
        parentId === null ? isNull(storageFolder.parentId) : eq(storageFolder.parentId, parentId)
      ))
      .limit(1);
    if (existing[0]) throw new BadRequestException('A folder with this name already exists here');

    const [folder] = await this.db.client
      .insert(storageFolder)
      .values({
        tenantId,
        name,
        parentId,
        createdBy: userId ? toBigInt(userId) : null,
      })
      .returning();
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
    const [folder] = await this.db.client
      .select({ id: storageFolder.id, name: storageFolder.name, parentId: storageFolder.parentId })
      .from(storageFolder)
      .where(and(eq(storageFolder.id, toBigInt(id)), ...this.storageFolderConditions()))
      .limit(1);
    if (!folder) throw new NotFoundException('Folder not found');

    const [duplicate] = await this.db.client
      .select({ id: storageFolder.id })
      .from(storageFolder)
      .where(and(
        eq(storageFolder.name, name),
        folder.parentId === null ? isNull(storageFolder.parentId) : eq(storageFolder.parentId, folder.parentId),
        ne(storageFolder.id, folder.id)
      ))
      .limit(1);
    if (duplicate) throw new BadRequestException('A folder with this name already exists here');

    await this.db.client
      .update(storageFolder)
      .set({ name })
      .where(and(eq(storageFolder.id, folder.id), ...this.storageFolderConditions()));
    return { success: true, id: folder.id.toString(), name };
  }

  async deleteFolder(id: string) {
    const [folder] = await this.db.client
      .select({ id: storageFolder.id })
      .from(storageFolder)
      .where(and(eq(storageFolder.id, toBigInt(id)), ...this.storageFolderConditions()))
      .limit(1);
    if (!folder) throw new NotFoundException('Folder not found');

    const [fileCountRows, childCountRows] = await Promise.all([
      this.db.client
        .select({ value: count() })
        .from(fileAsset)
        .where(and(eq(fileAsset.folderId, folder.id), ...this.fileAssetConditions())),
      this.db.client
        .select({ value: count() })
        .from(storageFolder)
        .where(and(eq(storageFolder.parentId, folder.id), ...this.storageFolderConditions())),
    ]);
    const fileCount = Number(fileCountRows[0]?.value ?? 0);
    const childCount = Number(childCountRows[0]?.value ?? 0);
    if (fileCount > 0 || childCount > 0) {
      throw new BadRequestException('Folder is not empty; move or delete its contents first');
    }

    await this.db.client
      .delete(storageFolder)
      .where(and(eq(storageFolder.id, folder.id), ...this.storageFolderConditions()));
    return { success: true, id: folder.id.toString() };
  }

  // ── Quota (based on the tenant's subscription plan) ───────────────────

  async currentUsageBytes(): Promise<number> {
    const rows = await this.db.client
      .select({ total: sql<bigint>`coalesce(sum(${fileAsset.fileSize}), 0)` })
      .from(fileAsset)
      .where(and(...this.fileAssetConditions()));
    const raw = rows[0]?.total;
    return raw == null ? 0 : Math.max(0, Number(raw));
  }

  async quotaInfo(): Promise<{ quotaBytes: number; planCode?: string; planName?: string }> {
    const tenantId = this.tenantContext.currentTenantId();
    if (!tenantId) return { quotaBytes: 0 };

    const [subscription] = await this.db.client
      .select({ planId: tenantSubscription.planId })
      .from(tenantSubscription)
      .where(and(eq(tenantSubscription.tenantId, tenantId), eq(tenantSubscription.status, 'active')))
      .limit(1);
    if (!subscription) return { quotaBytes: 0 };

    const [plan] = await this.db.client
      .select({ code: subscriptionPlan.code, name: subscriptionPlan.name, limits: subscriptionPlan.limits })
      .from(subscriptionPlan)
      .where(eq(subscriptionPlan.id, subscription.planId))
      .limit(1);
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
    const [requestItemsRows, vouchersRows] = await Promise.all([
      this.db.client.select({ value: count() }).from(requestItem).where(eq(requestItem.fileId, fileId)),
      this.db.client
        .select({ value: count() })
        .from(financePaymentVoucher)
        .where(eq(financePaymentVoucher.evidenceFileId, fileId)),
    ]);
    const requestItems = Number(requestItemsRows[0]?.value ?? 0);
    const vouchers = Number(vouchersRows[0]?.value ?? 0);

    const retirementCandidates = await this.db.client
      .select({
        id: financePaymentVoucher.id,
        voucherNumber: financePaymentVoucher.voucherNumber,
        metadata: financePaymentVoucher.metadata,
      })
      .from(financePaymentVoucher)
      .where(isNotNull(financePaymentVoucher.metadata));
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
