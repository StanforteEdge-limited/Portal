import { defineRelations } from 'drizzle-orm';
import * as schema from './schema';
import { modules_crm_accountsRelations } from '$modules/crm/accounts/model';
import { modules_crm_activitiesRelations } from '$modules/crm/activities/model';
import { modules_crm_contactsRelations } from '$modules/crm/contacts/model';
import { modules_crm_leadsRelations } from '$modules/crm/leads/model';
import { modules_crm_opportunitiesRelations } from '$modules/crm/opportunities/model';
import { modules_crm_pipelinesRelations } from '$modules/crm/pipelines/model';
import { modules_communicationRelations } from '$modules/communication/chat/model';
import { modules_identity_auditRelations } from '$modules/identity/audit/model';
import { modules_identity_authRelations } from '$modules/identity/auth/model';
import { modules_identity_rbacRelations } from '$modules/identity/rbac/model';
import { modules_storageRelations } from '$modules/storage/model';
import { modules_requests_documentsRelations } from '$modules/hrm/documents/model';
import { modules_requests_formsRelations } from '$modules/hrm/forms/model';
import { modules_requests_workflowRelations } from '$modules/hrm/workflow/model';
import { modules_tenancyRelations } from '$modules/tenancy/model';

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
