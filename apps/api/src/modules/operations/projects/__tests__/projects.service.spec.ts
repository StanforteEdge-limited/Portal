import { GroupUserRole } from '$common/db/drizzle-compat';
import { ProjectsService } from '$modules/operations/projects/projects.service';

describe('ProjectsService transaction boundaries', () => {
  const drizzle: any = {
    organization: { findUnique: jest.fn() },
    project: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    projectMember: { upsert: jest.fn(), findFirst: jest.fn() },
    projectGovernance: { upsert: jest.fn(), update: jest.fn() },
    requestInstance: { findMany: jest.fn() },
    $transaction: jest.fn(async (callback: any) => callback(drizzle)),
  };

  const service = new ProjectsService(drizzle);

  beforeEach(() => {
    jest.clearAllMocks();
    drizzle.organization.findUnique.mockResolvedValue({ id: 2n });
    drizzle.project.findUnique.mockResolvedValue({
      id: 10n,
      name: 'Alpha',
      description: null,
      isActive: true,
      governance: null,
      members: [],
      organization: null,
    });
    drizzle.project.create.mockResolvedValue({ id: 10n });
    drizzle.projectMember.findFirst.mockResolvedValue({ role: GroupUserRole.admin });
    drizzle.requestInstance.findMany.mockResolvedValue([]);
  });

  it('creates a project inside a transaction', async () => {
    await service.create('1', {
      name: 'Alpha',
      organization_id: '2',
      owner_user_id: '3',
      project_code: 'P-1',
    });

    expect(drizzle.$transaction).toHaveBeenCalled();
    expect(drizzle.projectMember.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { unique_project_user: { projectId: 10n, userId: 1n } },
      })
    );
  });

  it('updates project and governance inside a transaction', async () => {
    await service.update('10', '1', {
      name: 'Renamed',
      governance_status: 'on_hold',
    });

    expect(drizzle.$transaction).toHaveBeenCalled();
    expect(drizzle.project.update).toHaveBeenCalled();
    expect(drizzle.projectGovernance.upsert).toHaveBeenCalled();
  });

  it('archives project and governance inside a transaction', async () => {
    await service.archive('10', '1');

    expect(drizzle.$transaction).toHaveBeenCalled();
    expect(drizzle.project.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ isActive: false }) })
    );
    expect(drizzle.projectGovernance.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { governanceStatus: 'archived' } })
    );
  });
});
