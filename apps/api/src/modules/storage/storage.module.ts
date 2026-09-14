import { Module } from '@nestjs/common';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';
import { S3StorageService } from './s3-storage.service';

@Module({
  controllers: [StorageController],
  providers: [StorageService, S3StorageService],
  exports: [StorageService],
})
export class StorageModule {}