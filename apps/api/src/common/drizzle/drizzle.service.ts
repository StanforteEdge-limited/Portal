import { Injectable } from '@nestjs/common';
import { DbService } from '$common/db/db.service';
import { RepositoryService } from '$common/db/repository.service';

@Injectable()
export class DrizzleService extends RepositoryService {
  constructor(dbService: DbService) {
    super(dbService);
  }
}
