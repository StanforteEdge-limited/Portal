import { GroupUserRole } from '@prisma/client';
import { ProjectsService } from '../projects.service';

describe('ProjectsService transaction boundaries', () => {
  const prisma: any = {
    organization: { findUnique: jest.fn() },
    project: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    projectMember: { upsert: jest.fn(), findFirst: jest.fn() },
    projectGovernance: { upsert: jest.fn(), update: jest.fn() },
    requestInstance: { findMany: jest.fn() },
    $transaction: jest.fn(async (callback: any) => callback(prisma)),
  };

  const service = new ProjectsService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.organization.findUnique.mockResolvedValue({ id: 2n });
    prisma.project.findUnique.mockResolvedValue({
      id: 10n,
      name: 'Alpha',
      description: null,
      isActive: true,
      governance: null,
      members: [],
      organization: null,
    });
    prisma.project.create.mockResolvedValue({ id: 10n });
    prisma.projectMember.findFirst.mockResolvedValue({ role: GroupUserRole.admin });
    prisma.requestInstance.findMany.mockResolvedValue([]);
  });

  it('creates a project inside a transaction', async () => {
    await service.create('1', {
      name: 'Alpha',
      organization_id: '2',
      owner_user_id: '3',
      project_code: 'P-1',
    });

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.projectMember.upsert).toHaveBeenCalledWith(
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

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.project.update).toHaveBeenCalled();
    expect(prisma.projectGovernance.upsert).toHaveBeenCalled();
  });

  it('archives project and governance inside a transaction', async () => {
    await service.archive('10', '1');

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.project.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ isActive: false }) })
    );
    expect(prisma.projectGovernance.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { governanceStatus: 'archived' } })
    );
  });
});
