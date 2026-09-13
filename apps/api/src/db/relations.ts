import { defineRelations } from 'drizzle-orm';
import * as schema from './schema';
import { modules_crmRelations } from '$modules/crm/model';
import { modules_directory_contactsRelations } from '$modules/directory/contacts/model';
import { modules_identity_auditRelations } from '$modules/identity/audit/model';
import { modules_identity_authRelations } from '$modules/identity/auth/model';
import { modules_identity_rbacRelations } from '$modules/identity/rbac/model';
import { modules_platform_filesRelations } from '$modules/platform/files/model';
import { modules_requests_documentsRelations } from '$modules/requests/documents/model';
import { modules_requests_formsRelations } from '$modules/requests/forms/model';
import { modules_requests_workflowRelations } from '$modules/requests/workflow/model';
import { modules_tenancyRelations } from '$modules/tenancy/model';

export const relations = {
  ...defineRelations(schema),
  ...modules_crmRelations,
  ...modules_directory_contactsRelations,
  ...modules_identity_auditRelations,
  ...modules_identity_authRelations,
  ...modules_identity_rbacRelations,
  ...modules_platform_filesRelations,
  ...modules_requests_documentsRelations,
  ...modules_requests_formsRelations,
  ...modules_requests_workflowRelations,
  ...modules_tenancyRelations,
};
