import { Global, Module } from '@nestjs/common';
import { DbService } from './db.service';
import { RepositoryService } from './repository.service';

@Global()
@Module({
  providers: [DbService, RepositoryService],
  exports: [DbService, RepositoryService],
})
export class DbModule {}
