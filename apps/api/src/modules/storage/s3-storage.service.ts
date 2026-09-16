import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    // Object storage (S3 or any S3-compatible service) is the ONLY supported
    // upload backend. Local-disk uploads are not supported; unset S3 credentials
    // fail fast at boot so storage is never silently degraded to disk.
    this.bucket = String(process.env.S3_BUCKET || '').trim();
    if (!this.bucket) {
      throw new Error(
        'S3_BUCKET is required — object storage (AWS S3, MinIO, DigitalOcean Spaces, R2) is the only supported upload backend'
      );
    }
    const endpoint = String(process.env.S3_ENDPOINT || '').trim();
    this.client = new S3Client({
      region: String(process.env.S3_REGION || 'us-east-1').trim(),
      endpoint: endpoint || undefined,
      forcePathStyle: String(process.env.S3_FORCE_PATH_STYLE || 'false').toLowerCase() === 'true',
      credentials: {
        accessKeyId: String(process.env.S3_ACCESS_KEY_ID || ''),
        secretAccessKey: String(process.env.S3_SECRET_ACCESS_KEY || ''),
      },
    });
  }

  private clientOrThrow(): S3Client {
    return this.client;
  }

  private commandKey(tenantId: string | number | bigint, fileName: string): string {
    const safe = String(fileName)
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .slice(0, 200);
    return `tenants/${String(tenantId)}/files/${Date.now()}-${safe}`;
  }

  async putBuffer(opts: {
    tenantId: string | number | bigint;
    fileName: string;
    body: Buffer;
    contentType?: string;
    metadata?: Record<string, string>;
  }): Promise<{ key: string; etag?: string }> {
    const key = this.commandKey(opts.tenantId, opts.fileName);
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: opts.body,
      ContentType: opts.contentType || 'application/octet-stream',
      Metadata: opts.metadata,
    });
    const result = await this.clientOrThrow().send(command);
    return { key, etag: result.ETag };
  }

  async presignedUpload(opts: {
    tenantId: string | number | bigint;
    fileName: string;
    contentType?: string;
    expiresInSeconds?: number;
  }): Promise<{ key: string; url: string; fields: Record<string, string> }> {
    const key = this.commandKey(opts.tenantId, opts.fileName);
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: opts.contentType,
    });
    const url = await getSignedUrl(this.clientOrThrow(), command, {
      expiresIn: opts.expiresInSeconds ?? 300,
    });
    return {
      key,
      url,
      fields: {
        bucket: this.bucket,
        key,
        storage_disk: 's3',
      },
    };
  }

  async presignedDownload(opts: {
    key: string;
    fileName?: string;
    contentType?: string;
    expiresInSeconds?: number;
  }): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: opts.key,
      ResponseContentDisposition: opts.fileName ? `attachment; filename="${opts.fileName.replace(/"/g, '')}"` : undefined,
      ResponseContentType: opts.contentType,
    });
    return getSignedUrl(this.clientOrThrow(), command, { expiresIn: opts.expiresInSeconds ?? 300 });
  }

  async remove(key: string): Promise<void> {
    const command = new DeleteObjectCommand({ Bucket: this.bucket, Key: key });
    await this.clientOrThrow().send(command);
  }
}