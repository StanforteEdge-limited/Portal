import { Injectable } from '@nestjs/common';
import { DbService } from '$common/db/db.service';
import { RepositoryService } from '$common/db/repository.service';
import { TenantContextService } from '$common/auth/tenant-context.service';

@Injectable()
export class DrizzleService extends RepositoryService {
  constructor(dbService: DbService, tenantContext: TenantContextService) {
    super(dbService, tenantContext);
  }
}
