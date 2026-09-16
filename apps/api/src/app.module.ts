import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { DbModule } from '$common/db/db.module';
import { TenantContextInterceptor } from '$common/http/tenant-context.interceptor';
import { HealthModule } from '$modules/platform/health/health.module';
import { AuthModule } from '$modules/identity/auth/auth.module';
import { RbacModule } from '$modules/identity/rbac/rbac.module';
import { AdminModule } from '$modules/identity/admin/admin.module';
import { UsersModule } from '$modules/identity/users/users.module';
import { OrganizationsModule } from '$modules/hrm/organizations/organizations.module';
import { CrmAccountsModule } from '$modules/crm/accounts/accounts.module';
import { CrmActivitiesModule } from '$modules/crm/activities/activities.module';
import { CrmContactsModule } from '$modules/crm/contacts/contacts.module';
import { CrmLeadsModule } from '$modules/crm/leads/leads.module';
import { CrmOpportunitiesModule } from '$modules/crm/opportunities/opportunities.module';
import { CrmPipelinesModule } from '$modules/crm/pipelines/pipelines.module';
import { ChatModule } from '$modules/communication/chat/chat.module';
import { FormsModule } from '$modules/hrm/forms/forms.module';
import { RequestsModule } from '$modules/hrm/requests/requests.module';
import { WorkflowModule } from '$modules/hrm/workflow/workflow.module';
import { FinanceModule } from '$modules/finance/finance/finance.module';
import { ProcurementModule } from '$modules/finance/procurement/procurement.module';
import { VendorPortalModule } from '$modules/finance/vendor-portal/vendor-portal.module';
import { EmployeesModule } from '$modules/hrm/employees/employees.module';
import { AttendanceModule } from '$modules/hrm/attendance/attendance.module';
import { LeaveModule } from '$modules/hrm/leave/leave.module';
import { NotificationsModule } from '$modules/hrm/notifications/notifications.module';
import { AnalyticsModule } from '$modules/analytics/analytics.module';
import { DocumentsModule } from '$modules/hrm/documents/documents.module';
import { StorageModule } from '$modules/storage/storage.module';
import { TaxonomyModule } from '$modules/hrm/taxonomy/taxonomy.module';
import { AuditModule } from '$modules/identity/audit/audit.module';
import { ProjectsModule } from '$modules/hrm/projects/projects.module';
import { GroupsModule } from '$modules/communication/groups/groups.module';
import { OnboardingModule } from '$modules/hrm/onboarding/onboarding.module';
import { AcknowledgementsModule } from '$modules/hrm/acknowledgements/acknowledgements.module';
import { PoliciesModule } from '$modules/hrm/policies/policies.module';
import { PayrollModule } from '$modules/hrm/payroll/payroll.module';
import { TasksModule } from '$modules/hrm/tasks/tasks.module';
import { VersionModule } from '$modules/platform/version/version.module';
import { MailModule } from '$modules/communication/mail/mail.module';
import { BackgroundJobsModule } from '$modules/background-jobs/background-jobs.module';
import { TenancyModule } from '$modules/tenancy/tenancy.module';
import { BillingModule } from '$modules/platform/billing/billing.module';
import { QueuesModule } from '$common/queues/queues.module';
import { AppCacheModule } from '$common/cache/cache.module';
import { RateLimitModule } from '$common/rate-limit/rate-limit.module';
import { DistributedLockModule } from '$common/locks/distributed-lock.module';
import { SchedulingModule } from '$modules/scheduling/scheduling.module';

@Module({
  imports: [
    DbModule,
    HealthModule,
    AuthModule,
    RbacModule,
    AdminModule,
    UsersModule,
    OrganizationsModule,
    CrmAccountsModule,
    CrmActivitiesModule,
    CrmContactsModule,
    CrmLeadsModule,
    CrmOpportunitiesModule,
    CrmPipelinesModule,
    ChatModule,
    FormsModule,
    RequestsModule,
    WorkflowModule,
    FinanceModule,
    ProcurementModule,
    VendorPortalModule,
    EmployeesModule,
    AttendanceModule,
    LeaveModule,
    NotificationsModule,
    AnalyticsModule,
    DocumentsModule,
    StorageModule,
    TaxonomyModule,
    AuditModule,
    ProjectsModule,
    GroupsModule,
    OnboardingModule,
    AcknowledgementsModule,
    PoliciesModule,
    PayrollModule,
    TasksModule,
    VersionModule,
    MailModule,
    BackgroundJobsModule,
    TenancyModule,
    BillingModule,
    QueuesModule,
    AppCacheModule,
    RateLimitModule,
    DistributedLockModule,
    SchedulingModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantContextInterceptor,
    },
  ],
})
export class AppModule {}
