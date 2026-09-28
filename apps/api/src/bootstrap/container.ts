import { JwtService } from '$core/auth/jwt.service';
import { DbService } from '$core/db';
import { TenantContextService } from '$core/auth/tenant-context.service';
import { DistributedLockService } from '$core/locks';
import { MailService } from '$core/mail';
import { MailTemplatesService } from '$core/mail';
import { MailQueueService } from '$app/jobs/queues';
import { PdfService } from '$core/pdf';
import { CacheService } from '$core/cache';
import { QueueRegistry } from '$app/jobs/queues';
import type { Redis } from 'ioredis';
import { config } from '../config';

import { AuthService } from '$apps/identity/auth/service';
import { RbacService } from '$apps/identity/rbac/service';
import { AuditService } from '$apps/identity/audit/service';
import { UsersService } from '$apps/identity/users/service';
import { AdminService } from '$apps/identity/users/admin';

import { S3StorageService } from '$apps/storage/s3-storage';
import { StorageService } from '$apps/storage/service';

import { NotificationsService } from '$apps/hr/notifications/service';
import { WorkflowService } from '$apps/hr/workflow/service';
import { FormsService } from '$apps/hr/forms/service';
import { RequestsService } from '$apps/hr/requests/service';
import { RequestDocumentFacadeService } from '$apps/hr/requests/documents/service';
import { DeductionService } from '$apps/finance/accounting/deduction';
import { ProcurementDocumentFacadeService } from '$apps/finance/procurement/documents/service';
import { PayrollService } from '$apps/hr/payroll/service';
import { FinanceService } from '$apps/finance/accounting/service';
import { ProcurementService } from '$apps/finance/procurement/service';
import { VendorPortalService } from '$apps/finance/vendor_portal/service';

import { OrganizationsService } from '$apps/hr/organizations/service';
import { EmployeesService } from '$apps/hr/employees/service';
import { AttendanceService } from '$apps/hr/attendance/service';
import { LeaveService } from '$apps/hr/leave/service';
import { DocumentsService } from '$apps/hr/documents/service';
import { TaxonomyService } from '$apps/hr/taxonomy/service';
import { ProjectsService } from '$apps/hr/projects/service';
import { OnboardingService } from '$apps/hr/onboarding/service';
import { AcknowledgementsService } from '$apps/hr/acknowledgements/service';
import { PoliciesService } from '$apps/hr/policies/service';
import { TasksService } from '$apps/hr/tasks/service';

import { CrmAccountsService } from '$apps/crm/accounts/service';
import { CrmActivitiesService } from '$apps/crm/activities/service';
import { CrmContactsService } from '$apps/crm/contacts/service';
import { CrmLeadsService } from '$apps/crm/leads/service';
import { CrmOpportunitiesService } from '$apps/crm/opportunities/service';
import { CrmPipelinesService } from '$apps/crm/pipelines/service';

import { ChatRealtimeService } from '$apps/communication/chat/chat-realtime';
import { ChatService } from '$apps/communication/chat/service';
import { GroupsService } from '$apps/communication/groups/service';
import { MailCryptoService } from '$apps/communication/mail/mail-crypto';
import { MailAccountService } from '$apps/communication/mail/service';

import { TenancyService } from '$apps/tenancy/service';
import { HealthService } from '$apps/platform/health';
import { VersionService } from '$apps/platform/version/service';
import { PaystackService } from '$apps/platform/billing/paystack';
import { BillingService } from '$apps/platform/billing/service';
import { AnalyticsService } from '$apps/analytics/service';
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

  get s3(): S3StorageService {
    return this.provide('s3', () => new S3StorageService());
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

  get procurementDocuments(): ProcurementDocumentFacadeService {
    return this.provide(
      'procurementDocuments',
      () => new ProcurementDocumentFacadeService(this.db, this.pdf, this.mailQueue),
    );
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
          this.procurementDocuments,
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
      () => new BillingService(this.db, new PaystackService(), this.cache),
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
