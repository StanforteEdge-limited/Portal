import { JwtService } from '$core/auth/jwt.service';
import { DbService } from '$core/db';
import { TenantContextService } from '$core/auth/tenant-context.service';
import { DistributedLockService } from '$core/locks';
import { MailService } from '$core/mail';
import { MailTemplatesService } from '$core/mail';
import { MailQueueService } from '$app/jobs/queues';
import { PdfService } from '$core/pdf';
import { CacheService } from '$core/cache';
import { QueueRegistry } from '$core/queues';
import type { Redis } from 'ioredis';
import { config } from '../config';

import { AuthService } from '$apps/identity/auth/repository';
import { RbacService } from '$apps/identity/rbac/repository';
import { AuditService } from '$apps/identity/audit/repository';
import { AdminService, UsersService } from '$apps/identity/users/repository';

import { ObjectStorageService } from '$core/storage';
import { StorageService } from '$apps/storage/repository';

import { NotificationsService } from '$apps/hr/notifications/repository';
import { WorkflowService } from '$apps/hr/workflow/repository';
import { FormsService } from '$apps/hr/forms/repository';
import { RequestsService } from '$apps/hr/requests/repository';
import { RequestDocumentFacadeService } from '$apps/hr/requests/repository';
import { DeductionService } from '$apps/finance/deductions';
import { PayrollService } from '$apps/hr/payroll/repository';
import { FinanceService } from '$apps/finance/accounting/repository';
import { ProcurementService } from '$apps/finance/procurement/repository';
import { VendorPortalService } from '$apps/finance/vendor_portal/repository';

import { OrganizationsService } from '$apps/hr/organizations/repository';
import { EmployeesService } from '$apps/hr/employees/repository';
import { AttendanceService } from '$apps/hr/attendance/repository';
import { LeaveService } from '$apps/hr/leave/repository';
import { DocumentsService } from '$apps/hr/documents/repository';
import { TaxonomyService } from '$apps/hr/taxonomy/repository';
import { ProjectsService } from '$apps/hr/projects/repository';
import { OnboardingService } from '$apps/hr/onboarding/repository';
import { AcknowledgementsService } from '$apps/hr/acknowledgements/repository';
import { PoliciesService } from '$apps/hr/policies/repository';
import { TasksService } from '$apps/hr/tasks/repository';

import { CrmAccountsService } from '$apps/crm/accounts/repository';
import { CrmActivitiesService } from '$apps/crm/activities/repository';
import { CrmContactsService } from '$apps/crm/contacts/repository';
import { CrmLeadsService } from '$apps/crm/leads/repository';
import { CrmOpportunitiesService } from '$apps/crm/opportunities/repository';
import { CrmPipelinesService } from '$apps/crm/pipelines/repository';

import { ChatRealtimeService } from '$apps/communication/chat/realtime';
import { ChatService } from '$apps/communication/chat/repository';
import { GroupsService } from '$apps/communication/groups/repository';
import { MailCryptoService } from '$apps/communication/mail/crypto';
import { MailAccountService } from '$apps/communication/mail/repository';

import { TenancyService } from '$apps/tenancy/repository';
import { HealthService } from '$apps/platform/health';
import { VersionService } from '$apps/platform/version/repository';
import { PaystackPaymentGatewayService } from '$core/payments';
import { BillingService } from '$apps/platform/billing/repository';
import { AnalyticsService } from '$apps/analytics/repository';
import { BackgroundJobsService } from '$app/jobs/background';

/**
 * Fastify has no dependency injection container, so every singleton and service
 * is wired here once and shared for the process lifetime. Services stay plain
 * classes.
 *
 * Wiring is lazy: a service is constructed the first time it is read, so a
 * process that never touches a domain (or a dev box without S3 credentials)
 * still boots. Route handlers read services through this object, so laziness is
 * invisible to them.
 */
export class Container {
  private readonly instances = new Map<string, unknown>();

  constructor(
    readonly db: DbService,
    readonly redis?: Redis,
  ) {}

  private provide<T>(key: string, factory: () => T): T {
    if (!this.instances.has(key)) this.instances.set(key, factory());
    return this.instances.get(key) as T;
  }

  /** Lets shutdown hooks clean up only the singletons that were actually used. */
  isProvided(key: string): boolean {
    return this.instances.has(key);
  }

  get tenantContext(): TenantContextService {
    return this.provide('tenantContext', () => new TenantContextService());
  }

  get jwt(): JwtService {
    return this.provide(
      'jwt',
      () =>
        new JwtService({
          secret: config.jwt.secret,
          signOptions: { expiresIn: config.jwt.expiresIn },
        }),
    );
  }

  get locks(): DistributedLockService {
    return this.provide('locks', () => new DistributedLockService(this.redis));
  }

  get cache(): CacheService {
    return this.provide('cache', () => new CacheService(this.redis));
  }

  get queues(): QueueRegistry {
    return this.provide('queues', () => new QueueRegistry());
  }

  get chatRealtime(): ChatRealtimeService {
    return this.provide('chatRealtime', () => new ChatRealtimeService());
  }

  get mail(): MailService {
    return this.provide('mail', () => new MailService(this.mailTemplates));
  }

  get mailTemplates(): MailTemplatesService {
    return this.provide('mailTemplates', () => new MailTemplatesService());
  }

  get mailQueue(): MailQueueService {
    return this.provide('mailQueue', () => new MailQueueService(this.queues.get('mail')));
  }

  get mailCrypto(): MailCryptoService {
    return this.provide('mailCrypto', () => new MailCryptoService());
  }

  get pdf(): PdfService {
    return this.provide('pdf', () => new PdfService());
  }

  get s3(): ObjectStorageService {
    return this.provide('s3', () => new ObjectStorageService());
  }

  get storage(): StorageService {
    return this.provide('storage', () => new StorageService(this.db, this.s3, this.tenantContext));
  }

  get auth(): AuthService {
    return this.provide('auth', () => new AuthService(this.db, this.jwt, this.mail, this.mailQueue));
  }

  get rbac(): RbacService {
    return this.provide('rbac', () => new RbacService(this.db, this.tenantContext, this.auth));
  }

  get audit(): AuditService {
    return this.provide('audit', () => new AuditService(this.db, this.tenantContext));
  }

  get users(): UsersService {
    return this.provide(
      'users',
      () => new UsersService(this.db, this.mail, this.mailQueue, this.tenantContext),
    );
  }

  get admin(): AdminService {
    return this.provide('admin', () => new AdminService(this.db, this.tenantContext, this.users));
  }

  get notifications(): NotificationsService {
    return this.provide(
      'notifications',
      () => new NotificationsService(this.db, this.tenantContext, this.queues.get('notifications')),
    );
  }

  get workflow(): WorkflowService {
    return this.provide('workflow', () => new WorkflowService(this.db));
  }

  get forms(): FormsService {
    return this.provide('forms', () => new FormsService(this.db, this.tenantContext));
  }

  get requests(): RequestsService {
    return this.provide(
      'requests',
      () =>
        new RequestsService(
          this.db,
          this.workflow,
          this.forms,
          this.notifications,
          this.requestDocuments,
          this.tenantContext,
        ),
    );
  }

  get requestDocuments(): RequestDocumentFacadeService {
    return this.provide(
      'requestDocuments',
      () =>
        new RequestDocumentFacadeService(this.db, this.pdf, this.mailQueue, this.deduction),
    );
  }

  get deduction(): DeductionService {
    return this.provide('deduction', () => new DeductionService(this.db, this.tenantContext, this.pdf));
  }

  get payroll(): PayrollService {
    return this.provide(
      'payroll',
      () =>
        new PayrollService(
          this.db,
          this.tenantContext,
          this.notifications,
          this.mail,
          this.pdf,
          this.storage,
        ),
    );
  }

  get finance(): FinanceService {
    return this.provide(
      'finance',
      () =>
        new FinanceService(
          this.db,
          this.notifications,
          this.mail,
          this.mailQueue,
          this.payroll,
          this.pdf,
          this.tenantContext,
        ),
    );
  }

  get procurement(): ProcurementService {
    return this.provide(
      'procurement',
      () =>
        new ProcurementService(
          this.db,
          this.tenantContext,
          this.workflow,
          this.notifications,
          this.mail,
          this.mailQueue,
          this.pdf,
        ),
    );
  }

  get vendorPortal(): VendorPortalService {
    return this.provide('vendorPortal', () => new VendorPortalService(this.db, this.jwt));
  }

  get organizations(): OrganizationsService {
    return this.provide('organizations', () => new OrganizationsService(this.db));
  }

  get employees(): EmployeesService {
    return this.provide('employees', () => new EmployeesService(this.db, this.tenantContext));
  }

  get attendance(): AttendanceService {
    return this.provide(
      'attendance',
      () => new AttendanceService(this.db, this.tenantContext, this.notifications),
    );
  }

  get leave(): LeaveService {
    return this.provide('leave', () => new LeaveService(this.db, this.notifications));
  }

  get documents(): DocumentsService {
    return this.provide('documents', () => new DocumentsService(this.db, this.tenantContext));
  }

  get taxonomy(): TaxonomyService {
    return this.provide('taxonomy', () => new TaxonomyService(this.db, this.tenantContext));
  }

  get projects(): ProjectsService {
    return this.provide('projects', () => new ProjectsService(this.db, this.tenantContext));
  }

  get onboarding(): OnboardingService {
    return this.provide('onboarding', () => new OnboardingService(this.db, this.tenantContext));
  }

  get acknowledgements(): AcknowledgementsService {
    return this.provide('acknowledgements', () => new AcknowledgementsService(this.db, this.tenantContext));
  }

  get policies(): PoliciesService {
    return this.provide('policies', () => new PoliciesService(this.db, this.tenantContext));
  }

  get tasks(): TasksService {
    return this.provide('tasks', () => new TasksService(this.db, this.tenantContext));
  }

  get crmAccounts(): CrmAccountsService {
    return this.provide('crmAccounts', () => new CrmAccountsService(this.db, this.tenantContext));
  }

  get crmActivities(): CrmActivitiesService {
    return this.provide('crmActivities', () => new CrmActivitiesService(this.db, this.tenantContext));
  }

  get crmContacts(): CrmContactsService {
    return this.provide('crmContacts', () => new CrmContactsService(this.db, this.tenantContext));
  }

  get crmLeads(): CrmLeadsService {
    return this.provide('crmLeads', () => new CrmLeadsService(this.db, this.tenantContext));
  }

  get crmOpportunities(): CrmOpportunitiesService {
    return this.provide('crmOpportunities', () => new CrmOpportunitiesService(this.db, this.tenantContext));
  }

  get crmPipelines(): CrmPipelinesService {
    return this.provide('crmPipelines', () => new CrmPipelinesService(this.db, this.tenantContext));
  }

  get chat(): ChatService {
    return this.provide('chat', () => new ChatService(this.db, this.tenantContext, this.chatRealtime));
  }

  get groups(): GroupsService {
    return this.provide('groups', () => new GroupsService(this.db, this.tenantContext));
  }

  get mailAccounts(): MailAccountService {
    return this.provide('mailAccounts', () => new MailAccountService(this.db, this.mailCrypto));
  }

  get tenancy(): TenancyService {
    return this.provide('tenancy', () => new TenancyService(this.db, this.users, this.tenantContext));
  }

  get health(): HealthService {
    return this.provide('health', () => new HealthService(this.db, this.locks));
  }

  get version(): VersionService {
    return this.provide('version', () => new VersionService(this.db));
  }

  get billing(): BillingService {
    return this.provide(
      'billing',
      () => new BillingService(this.db, new PaystackPaymentGatewayService(), this.cache),
    );
  }

  get analytics(): AnalyticsService {
    return this.provide('analytics', () => new AnalyticsService(this.db, this.cache));
  }

  get backgroundJobs(): BackgroundJobsService {
    return this.provide(
      'backgroundJobs',
      () =>
        new BackgroundJobsService(
          this.db,
          this.tenantContext,
          this.queues.get('background-jobs'),
        ),
    );
  }
}
