import { defineRelations } from 'drizzle-orm';
import * as schema from './schema';
import { modules_crm_accountsRelations } from '$apps/crm/accounts/model';
import { modules_crm_activitiesRelations } from '$apps/crm/activities/model';
import { modules_crm_contactsRelations } from '$apps/crm/contacts/model';
import { modules_crm_leadsRelations } from '$apps/crm/leads/model';
import { modules_crm_opportunitiesRelations } from '$apps/crm/opportunities/model';
import { modules_crm_pipelinesRelations } from '$apps/crm/pipelines/model';
import { modules_communicationRelations } from '$apps/communication/chat/model';
import { modules_identity_auditRelations } from '$apps/identity/audit/model';
import { modules_identity_authRelations } from '$apps/identity/auth/model';
import { modules_identity_rbacRelations } from '$apps/identity/rbac/model';
import { modules_storageRelations } from '$apps/storage/model';
import { modules_requests_documentsRelations } from '$apps/hr/documents/model';
import { modules_requests_formsRelations } from '$apps/hr/forms/model';
import { modules_requests_workflowRelations } from '$apps/hr/workflow/model';
import { modules_tenancyRelations } from '$apps/tenancy/model';

export const relations = {
  ...defineRelations(schema),
  ...modules_crm_accountsRelations,
  ...modules_crm_activitiesRelations,
  ...modules_crm_contactsRelations,
  ...modules_crm_leadsRelations,
  ...modules_crm_opportunitiesRelations,
  ...modules_crm_pipelinesRelations,
  ...modules_communicationRelations,
  ...modules_identity_auditRelations,
  ...modules_identity_authRelations,
  ...modules_identity_rbacRelations,
  ...modules_storageRelations,
  ...modules_requests_documentsRelations,
  ...modules_requests_formsRelations,
  ...modules_requests_workflowRelations,
  ...modules_tenancyRelations,
};
