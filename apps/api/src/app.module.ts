import { Module } from '@nestjs/common';
import { DrizzleModule } from '$common/drizzle/drizzle.module';
import { HealthModule } from '$modules/platform/health/health.module';
import { AuthModule } from '$modules/auth/auth/auth.module';
import { RbacModule } from '$modules/auth/rbac/rbac.module';
import { AdminModule } from '$modules/auth/admin/admin.module';
import { UsersModule } from '$modules/auth/users/users.module';
import { OrganizationsModule } from '$modules/directory/organizations/organizations.module';
import { ContactsModule } from '$modules/directory/contacts/contacts.module';
import { FormsModule } from '$modules/requests/forms/forms.module';
import { RequestsModule } from '$modules/requests/requests/requests.module';
import { WorkflowModule } from '$modules/requests/workflow/workflow.module';
import { FinanceModule } from '$modules/finance/finance/finance.module';
import { HrModule } from '$modules/hr/hr/hr.module';
import { LeaveModule } from '$modules/hr/leave/leave.module';
import { NotificationsModule } from '$modules/notifications/notifications.module';
import { AnalyticsModule } from '$modules/analytics/analytics.module';
import { DocumentsModule } from '$modules/requests/documents/documents.module';
import { FilesModule } from '$modules/platform/files/files.module';
import { TaxonomyModule } from '$modules/requests/taxonomy/taxonomy.module';
import { AuditModule } from '$modules/auth/audit/audit.module';
import { ProjectsModule } from '$modules/operations/projects/projects.module';
import { GroupsModule } from '$modules/directory/groups/groups.module';
import { OnboardingModule } from '$modules/hr/onboarding/onboarding.module';
import { AcknowledgementsModule } from '$modules/requests/acknowledgements/acknowledgements.module';
import { PoliciesModule } from '$modules/requests/policies/policies.module';
import { PayrollModule } from '$modules/hr/payroll/payroll.module';
import { WorkModule } from '$modules/operations/work/work.module';
import { VersionModule } from '$modules/platform/version/version.module';
import { MailModule } from '$modules/platform/mail/mail.module';
import { TenancyModule } from '$modules/tenancy/tenancy.module';
import { BillingModule } from '$modules/platform/billing/billing.module';
import { QueuesModule } from '$common/queues/queues.module';
import { AppCacheModule } from '$common/cache/cache.module';
import { SchedulingModule } from '$modules/scheduling/scheduling.module';

@Module({
  imports: [
    DrizzleModule,
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
    LeaveModule,
    NotificationsModule,
    AnalyticsModule,
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
    TenancyModule,
    BillingModule,
    QueuesModule,
    AppCacheModule,
    SchedulingModule,
  ],
  providers: [],
})
export class AppModule {}
