import { Module } from '@nestjs/common';
import { PrismaModule } from './common/prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { AdminModule } from './modules/admin/admin.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { FormsModule } from './modules/forms/forms.module';
import { RequestsModule } from './modules/requests/requests.module';
import { WorkflowModule } from './modules/workflow/workflow.module';
import { FinanceModule } from './modules/finance/finance.module';
import { HrModule } from './modules/hr/hr.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { FilesModule } from './modules/files/files.module';
import { TaxonomyModule } from './modules/taxonomy/taxonomy.module';
import { AuditModule } from './modules/audit/audit.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { GroupsModule } from './modules/groups/groups.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { AcknowledgementsModule } from './modules/acknowledgements/acknowledgements.module';
import { PoliciesModule } from './modules/policies/policies.module';
import { PayrollModule } from './modules/payroll/payroll.module';
import { WorkModule } from './modules/work/work.module';
import { VersionModule } from './modules/version/version.module';
import { MailModule } from './modules/mail/mail.module';

@Module({
  imports: [
    PrismaModule,
    HealthModule,
    AuthModule,
    RbacModule,
    AdminModule,
    UsersModule,
    OrganizationsModule,
    ContactsModule,
    FormsModule,
    RequestsModule,
    WorkflowModule,
    FinanceModule,
    HrModule,
    NotificationsModule,
    DocumentsModule,
    FilesModule,
    TaxonomyModule,
    AuditModule,
    ProjectsModule,
    GroupsModule,
    OnboardingModule,
    AcknowledgementsModule,
    PoliciesModule,
    PayrollModule,
    WorkModule,
    VersionModule,
    MailModule,
  ],
  providers: [],
})
export class AppModule {}
