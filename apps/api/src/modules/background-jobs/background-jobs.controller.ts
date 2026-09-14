import { BadRequestException, Controller, Get, NotFoundException, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '$common/auth/jwt-auth.guard';
import { BackgroundJobsService } from './background-jobs.service';
import { StorageService } from '$modules/storage/storage.service';

@ApiTags('Background Jobs')
@ApiBearerAuth('bearer')
@Controller('background-jobs')
export class BackgroundJobsController {
  constructor(
    private readonly jobs: BackgroundJobsService,
    private readonly storageService: StorageService,
  ) {}

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get background job status' })
  getJob(@Param('id') id: string) {
    return this.jobs.getJob(id);
  }

  @Get(':id/download')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get download URL for a completed background job artifact' })
  async download(@Param('id') id: string) {
    const job = await this.jobs.getJob(id);
    const fileAssetId = job.result && typeof job.result === 'object' ? (job.result as any).file_asset_id : undefined;
    if (!fileAssetId) {
      throw new BadRequestException('This job did not produce a downloadable file');
    }
    let downloadInfo;
    try {
      downloadInfo = await this.storageService.presignDownload(String(fileAssetId));
    } catch (error) {
      throw new NotFoundException('Download for this job is not available');
    }
    const url =
      (downloadInfo as any).presigned_url ?? (downloadInfo as any).url ?? undefined;
    if (!url) {
      throw new NotFoundException('Download for this job is not available');
    }
    return {
      file_name: (job.result as any).file_name ?? null,
      download_url: url,
    };
  }
}