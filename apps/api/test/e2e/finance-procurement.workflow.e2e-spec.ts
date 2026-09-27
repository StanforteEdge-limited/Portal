import { adminToken, apiRequest, expectData } from './helpers';

function expectCreated<T>(response: Awaited<ReturnType<typeof apiRequest<T>>>) {
  expect([200, 201]).toContain(response.status);
  expect(typeof response.body).toBe('object');
  const body = response.body as { success?: boolean; data?: T };
  expect(body.success).toBe(true);
  expect(body.data).toBeDefined();
  return body.data as T;
}

function items(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    const record = data as { items?: unknown; rows?: unknown; data?: unknown };
    if (Array.isArray(record.items)) return record.items;
    if (Array.isArray(record.rows)) return record.rows;
    if (Array.isArray(record.data)) return record.data;
    if (record.items && typeof record.items === 'object') return items(record.items);
    if (record.data && typeof record.data === 'object') return items(record.data);
  }
  return [];
}

function uniqueTitle(label: string) {
  return `${label} ${Date.now()} ${Math.random().toString(36).slice(2)}`;
}

describe('Finance + procurement workflow (e2e)', () => {
  let token: string;
  let requisitionId: string;
  let requisitionTitle: string;

  beforeAll(async () => {
    token = await adminToken();
  });

  it('reads healthy finance and deduction surfaces', async () => {
    const financeRequests = expectData(await apiRequest('/finance/requests', { token }));
    expect(items(financeRequests)).toEqual(expect.any(Array));

    const deductionTypes = expectData(await apiRequest('/finance/deduction-types', { token }));
    expect(items(deductionTypes)).toEqual(expect.any(Array));

    const statutoryDeductions = expectData(await apiRequest('/finance/statutory-deductions', { token }));
    expect(items(statutoryDeductions)).toEqual(expect.any(Array));

    const requestRemittances = expectData(await apiRequest('/finance/request-remittances', { token }));
    expect(items(requestRemittances)).toEqual(expect.any(Array));

    const whtRemittances = expectData(await apiRequest('/finance/wht-remittances', { token }));
    expect(items(whtRemittances)).toEqual(expect.any(Array));
  });

  it('creates a draft procurement requisition and reads it back', async () => {
    requisitionTitle = uniqueTitle('Integration PR');

    const requisition = expectCreated<{
      id: string;
      title: string;
      status: string;
      estimatedTotal?: string | number;
      requisitionNumber?: string;
    }>(
      await apiRequest('/procurement/requisitions', {
        method: 'POST',
        token,
        body: {
          title: requisitionTitle,
          category: 'goods',
          paymentPattern: 'post_delivery',
          justification: 'Backend integration coverage',
          items: [
            {
              description: 'Laptop docking station',
              qty: 2,
              unit: 'pcs',
              estimatedUnitCost: 150000,
            },
          ],
        },
      }),
    );

    requisitionId = requisition.id;
    expect(requisition.title).toBe(requisitionTitle);
    expect(requisition.status).toBe('draft');
    expect(requisition.requisitionNumber).toBeDefined();

    const detail = expectData(await apiRequest(`/procurement/requisitions/${requisitionId}`, { token })) as {
      id?: string;
      title?: string;
      requester?: unknown;
      purchaseOrders?: unknown[];
    };
    expect(detail.id).toBe(requisitionId);
    expect(detail.title).toBe(requisitionTitle);
    expect(detail.requester).toBeDefined();
    expect(Array.isArray(detail.purchaseOrders)).toBe(true);
  });

  it('lists procurement requisitions, orders, and intake queues', async () => {
    const requisitions = expectData(await apiRequest('/procurement/requisitions', { token }));
    const requisitionItems = items(requisitions) as Array<{ id?: string; title?: string; procurementCase?: unknown }>;
    expect(requisitionItems.some((item) => item.id === requisitionId && item.title === requisitionTitle)).toBe(true);

    const orders = expectData(await apiRequest('/procurement/orders', { token }));
    expect(items(orders)).toEqual(expect.any(Array));

    const intake = expectData(await apiRequest('/procurement/intake', { token }));
    expect(items(intake)).toEqual(expect.any(Array));
  });

  it('rejects invalid procurement and finance mutations cleanly', async () => {
    const invalidPr = await apiRequest('/procurement/requisitions', {
      method: 'POST',
      token,
      body: {
        title: '',
        category: 'invalid',
        paymentPattern: 'post_delivery',
        items: [],
      },
    });
    expect(invalidPr.status).toBe(400);
    expect((invalidPr.body as { success?: boolean }).success).toBe(false);

    const missingRequisitionPo = await apiRequest('/procurement/orders', {
      method: 'POST',
      token,
      body: {
        vendorId: '1',
        paymentPattern: 'post_delivery',
        approvalFlowJson: {},
        items: [{ description: 'Laptop', qty: 1, unit: 'pcs', unitCost: 1 }],
      },
    });
    expect(missingRequisitionPo.status).toBe(400);
    expect((missingRequisitionPo.body as { success?: boolean }).success).toBe(false);

    const invalidRemittance = await apiRequest('/finance/request-remittances', {
      method: 'POST',
      token,
      body: { deduction_ids: ['not-a-uuid'], reference: 'INVALID-E2E' },
    });
    expect([400, 422]).toContain(invalidRemittance.status);
    expect((invalidRemittance.body as { success?: boolean }).success).toBe(false);
  });

  it('enforces authentication on finance, procurement, and vendor portal surfaces', async () => {
    const finance = await apiRequest('/finance/requests');
    expect(finance.status).toBe(401);

    const procurement = await apiRequest('/procurement/requisitions');
    expect(procurement.status).toBe(401);

    const vendorPortal = await apiRequest('/vendor-portal/orders');
    expect(vendorPortal.status).toBe(401);
  });
});
