export interface TenantContext {
  scope?: 'tenant';
  tenantId: bigint;
  profileId: bigint;
  membershipId: bigint;
  isOwner: boolean;
}

export interface SystemContext {
  scope: 'system';
  reason: string;
}
