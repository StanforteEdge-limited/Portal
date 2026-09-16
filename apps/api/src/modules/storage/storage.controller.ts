import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '$common/auth/jwt-auth.guard';
import { Permissions } from '$common/auth/permissions.decorator';
import { PermissionsGuard } from '$common/auth/permissions.guard';
import { AttachFileDto } from './dto/attach-file.dto';
import { StorageService } from './storage.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

@Controller('storage')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiTags('Storage')
@ApiBearerAuth('bearer')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  private static maxUploadBytes() {
    const mb = Number(process.env.FILE_UPLOAD_MAX_MB || 10);
    return Math.max(1, mb) * 1024 * 1024;
  }

  private static allowedMimeTypes() {
    const fromEnv = String(process.env.FILE_UPLOAD_ALLOWED_MIME || '').trim();
    if (!fromEnv) return null;
    return fromEnv
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
  }

  @Get()
  @Permissions('requests.view')
  @ApiOperation({ summary: 'List stored files (optionally within a folder_id or root)' })
  list(@Query() query: Record<string, any>) {
    return this.storageService.list(query);
  }

  @Get('quota')
  @Permissions('requests.view')
  @ApiOperation({ summary: 'Storage usage against the tenant plan quota' })
  quota() {
    return this.storageService.quota();
  }

  @Get('folders')
  @Permissions('requests.view')
  @ApiOperation({ summary: 'List folders (pass parent_id for children, root for top level)' })
  listFolders(@Query() query: Record<string, any>) {
    return this.storageService.listFolders(query);
  }

  @Post('folders')
  @Permissions('requests.manage')
  @ApiOperation({ summary: 'Create a folder' })
  createFolder(@Req() req: any, @Body() dto: { name?: string; parent_id?: string }) {
    return this.storageService.createFolder(req.user?.id, dto);
  }

  @Patch('folders/:id')
  @Permissions('requests.manage')
  @ApiOperation({ summary: 'Rename a folder' })
  renameFolder(@Param('id') id: string, @Body() dto: { name?: string }) {
    return this.storageService.renameFolder(id, dto);
  }

  @Delete('folders/:id')
  @Permissions('requests.manage')
  @ApiOperation({ summary: 'Delete an empty folder' })
  deleteFolder(@Param('id') id: string) {
    return this.storageService.deleteFolder(id);
  }

  @Post()
  @Permissions('requests.create')
  @ApiOperation({ summary: 'Create a file asset record (attach an existing object)' })
  @ApiBody({
    type: AttachFileDto,
    examples: {
      invoice: {
        value: {
          storage_disk: 's3',
          storage_path: 'tenants/241/files/invoice-2026-02-17-001.pdf',
          file_name: 'invoice-001.pdf',
          mime_type: 'application/pdf',
          file_size: 245899,
          file_url: 'https://cdn.stanforteedge.com/tenants/241/files/invoice-2026-02-17-001.pdf'
        }
      }
    }
  })
  create(@Req() req: any, @Body() dto: AttachFileDto) {
    return this.storageService.attach(req.user?.id, dto);
  }

  @Post('attach')
  @Permissions('requests.create')
  @ApiOperation({ summary: 'Alias endpoint for creating a file asset record' })
  attach(@Req() req: any, @Body() dto: AttachFileDto) {
    return this.storageService.attach(req.user?.id, dto);
  }

  @Post('presign-upload')
  @Permissions('requests.create')
  @ApiOperation({ summary: 'Get a presigned PUT URL to upload directly to S3-compatible storage' })
  presignUpload(
    @Body() payload: { file_name?: string; mime_type?: string; file_size?: number; expires_in_seconds?: number }
  ) {
    return this.storageService.presignUpload(payload);
  }

  @Get(':id/presign-download')
  @Permissions('requests.view')
  @ApiOperation({ summary: 'Get a presigned download URL for a stored file' })
  presignDownload(@Param('id') id: string, @Query('expires_in_seconds') expiresInSeconds?: string) {
    return this.storageService.presignDownload(id, expiresInSeconds ? Math.max(1, Number(expiresInSeconds)) : undefined);
  }

  @Get(':id/usage')
  @Permissions('requests.view')
  @ApiOperation({ summary: 'Get attachment usage summary for a file' })
  usage(@Param('id') id: string) {
    return this.storageService.getUsage(id);
  }

  @Get(':id')
  @Permissions('requests.view')
  @ApiOperation({ summary: 'Get file asset by ID' })
  findOne(@Param('id') id: string) {
    return this.storageService.findOne(id);
  }

  @Delete(':id')
  @Permissions('requests.manage')
  @ApiOperation({ summary: 'Delete file if not attached to any request/PV/retirement' })
  remove(@Param('id') id: string) {
    return this.storageService.remove(id);
  }

  @Post('upload')
  @Permissions('requests.create')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: StorageController.maxUploadBytes()
      },
      fileFilter: (_req, file, cb) => {
        const allowed = StorageController.allowedMimeTypes();
        if (!allowed || allowed.length === 0) {
          cb(null, true);
          return;
        }
        const mime = String(file.mimetype || '').toLowerCase();
        if (allowed.includes(mime)) {
          cb(null, true);
          return;
        }
        cb(new BadRequestException(`Unsupported file type: ${mime}`) as unknown as Error, false);
      },
      storage: memoryStorage()
    })
  )
  @ApiOperation({ summary: 'Upload a file directly to S3 object storage' })
  upload(
    @Req() req: any,
    @UploadedFile() file: any,
    @Body('organization_id') organizationId?: string,
    @Body('folder_id') folderId?: string,
    @Body('metadata_json') metadataJson?: string
  ) {
    const metadata = metadataJson ? (JSON.parse(metadataJson) as Record<string, unknown>) : undefined;
    return this.storageService.createFromUploadedFile(req.user?.id, file, {
      organization_id: organizationId,
      folder_id: folderId,
      metadata
    });
  }
}