import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Permissions } from '../../common/auth/permissions.decorator';
import { PermissionsGuard } from '../../common/auth/permissions.guard';
import { AttachFileDto } from './dto/attach-file.dto';
import { FilesService } from './files.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync } from 'node:fs';
import { extname, resolve } from 'node:path';

@Controller('files')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiTags('Files')
@ApiBearerAuth('bearer')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

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

  private static ensureUploadDir() {
    const uploadsDir = resolve(process.cwd(), 'uploads/files');
    if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });
    return uploadsDir;
  }

  @Get()
  @Permissions('requests.view')
  @ApiOperation({ summary: 'List uploaded files from central file table' })
  list(@Query() query: Record<string, any>) {
    return this.filesService.list(query);
  }

  @Post()
  @Permissions('requests.create')
  @ApiOperation({ summary: 'Create file asset record' })
  @ApiBody({
    type: AttachFileDto,
    examples: {
      invoice: {
        value: {
          storage_disk: 'local',
          storage_path: 'uploads/requests/invoice-001.pdf',
          file_name: 'invoice-001.pdf',
          mime_type: 'application/pdf',
          file_size: 245899,
          file_url: 'https://cdn.stanforteedge.com/uploads/requests/invoice-001.pdf'
        }
      }
    }
  })
  create(@Req() req: any, @Body() dto: AttachFileDto) {
    return this.filesService.attach(req.user?.id, dto);
  }

  @Post('attach')
  @Permissions('requests.create')
  @ApiOperation({ summary: 'Alias endpoint for creating file asset record' })
  attach(@Req() req: any, @Body() dto: AttachFileDto) {
    return this.filesService.attach(req.user?.id, dto);
  }

  @Get(':id/usage')
  @Permissions('requests.view')
  @ApiOperation({ summary: 'Get attachment usage summary for a file' })
  usage(@Param('id') id: string) {
    return this.filesService.getUsage(id);
  }

  @Get(':id')
  @Permissions('requests.view')
  @ApiOperation({ summary: 'Get file asset by ID' })
  findOne(@Param('id') id: string) {
    return this.filesService.findOne(id);
  }

  @Delete(':id')
  @Permissions('requests.manage')
  @ApiOperation({ summary: 'Delete file if not attached to any request/PV/retirement' })
  remove(@Param('id') id: string) {
    return this.filesService.remove(id);
  }

  @Post('upload')
  @Permissions('requests.create')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: FilesController.maxUploadBytes()
      },
      fileFilter: (_req, file, cb) => {
        const allowed = FilesController.allowedMimeTypes();
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
      storage: diskStorage({
        destination: (_req: any, _file: any, cb: (error: Error | null, destination: string) => void) => {
          cb(null, FilesController.ensureUploadDir());
        },
        filename: (_req: any, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
          const safeBase = (file.originalname || 'file')
            .replace(/\.[^/.]+$/, '')
            .replace(/[^a-zA-Z0-9-_]+/g, '-')
            .slice(0, 80);
          const ext = extname(file.originalname || '').toLowerCase();
          cb(null, `${Date.now()}-${safeBase || 'file'}${ext}`);
        }
      })
    })
  )
  @ApiOperation({ summary: 'Upload file and create file asset record in one step' })
  upload(
    @Req() req: any,
    @UploadedFile() file: any,
    @Body('organization_id') organizationId?: string,
    @Body('metadata_json') metadataJson?: string
  ) {
    const metadata = metadataJson ? (JSON.parse(metadataJson) as Record<string, unknown>) : undefined;
    return this.filesService.createFromUploadedFile(req.user?.id, file, {
      organization_id: organizationId,
      metadata
    });
  }
}
