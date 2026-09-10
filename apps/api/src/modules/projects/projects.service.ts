import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { GroupUserRole, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { paginatedResponse } from '../../common/helpers/paginated-response';
import { toBigInt } from '../../common/utils/ids';
import { AddProjectMemberDto } from './dto/add-project-member.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: Record<string, any>) {
    const where: Prisma.ProjectWhereInput = {};
    if (query.organization_id) where.organizationId = this.parseId(String(query.organization_id), 'organization id');
    if (query.active_only === 'true') where.isActive = true;
    if (query.search) {
      where.OR = [
        { name: { contains: String(query.search), mode: 'insensitive' } },
        { description: { contains: String(query.search), mode: 'insensitive' } }
      ];
    }
    if (query.owner_user_id) {
      const ownerId = this.parseId(String(query.owner_user_id), 'owner user id');
      where.members = {
        some: { userId: ownerId, role: GroupUserRole.admin }
      };
    }

    const rows = await this.prisma.project.findMany({
      where,
      include: {
        organization: true,
        governance: true,
        members: {
          include: {
            user: { select: { id: true, email: true, username: true, firstName: true, lastName: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    const items = rows.map((row) => this.serializeProject(row));
    return paginatedResponse(items, { page: 1, per_page: items.length, total: items.length });
  }

  async get(id: string) {
    const projectId = this.parseId(id, 'project id');
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        organization: true,
        governance: true,
        members: {
          include: {
            user: { select: { id: true, email: true, username: true, firstName: true, lastName: true } }
          }
        }
      }
    });

    if (!project) throw new NotFoundException('Project not found');
    return this.serializeProject(project);
  }

  async create(createdBy: string, dto: CreateProjectDto) {
    const createdById = this.parseId(createdBy, 'creator id');
    const organizationId = dto.organization_id
      ? this.parseId(dto.organization_id, 'organization id')
      : null;

    if (organizationId) {
      const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
      if (!org) throw new NotFoundException('Organization not found');
    }

    const ownerId = dto.owner_user_id ? this.parseId(dto.owner_user_id, 'owner user id') : createdById;

    const project = await this.prisma.$transaction(async (tx) => {
      const created = await tx.project.create({
        data: {
          name: dto.name,
          description: dto.description,
          createdBy: createdById,
          updatedBy: createdById,
          organizationId,
          isActive: true,
          governance: {
            create: {
              projectCode: dto.project_code ?? null,
              ownerUserId: ownerId,
              startDate: dto.start_date ? new Date(dto.start_date) : null,
              endDate: dto.end_date ? new Date(dto.end_date) : null,
              governanceStatus: dto.governance_status ?? 'planned'
            }
          },
          members: {
            create: {
              userId: ownerId,
              role: GroupUserRole.admin,
              addedBy: createdById
            }
          }
        }
      });

      if (ownerId !== createdById) {
        await tx.projectMember.upsert({
          where: {
            unique_project_user: {
              projectId: created.id,
              userId: createdById
            }
          },
          update: { role: GroupUserRole.admin, addedBy: createdById },
          create: {
            projectId: created.id,
            userId: createdById,
            role: GroupUserRole.admin,
            addedBy: createdById
          }
        });
      }

      return tx.project.findUnique({
        where: { id: created.id },
        include: {
          organization: true,
          governance: true,
          members: {
            include: {
              user: { select: { id: true, email: true, username: true, firstName: true, lastName: true } }
            }
          }
        }
      });
    });

    return this.serializeProject(project);
  }

  async update(id: string, userId: string, dto: UpdateProjectDto) {
    const projectId = this.parseId(id, 'project id');
    const actorId = this.parseId(userId, 'user id');
    await this.ensureProjectAccess(projectId, actorId);

    const existing = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { governance: true }
    });
    if (!existing) throw new NotFoundException('Project not found');

    const projectData: Prisma.ProjectUpdateInput = {
      updatedBy: actorId
    };
    if (dto.name !== undefined) projectData.name = dto.name;
    if (dto.description !== undefined) projectData.description = dto.description;
    if (dto.is_active !== undefined) projectData.isActive = dto.is_active;

    const governanceData: Record<string, any> = {};
    if (dto.project_code !== undefined) governanceData.projectCode = dto.project_code;
    if (dto.start_date !== undefined) governanceData.startDate = dto.start_date ? new Date(dto.start_date) : null;
    if (dto.end_date !== undefined) governanceData.endDate = dto.end_date ? new Date(dto.end_date) : null;
    if (dto.governance_status !== undefined) governanceData.governanceStatus = dto.governance_status;
    if (dto.owner_user_id !== undefined) governanceData.ownerUserId = this.parseId(dto.owner_user_id, 'owner user id');

    await this.prisma.$transaction(async (tx) => {
      await tx.project.update({
        where: { id: projectId },
        data: projectData
      });

      if (Object.keys(governanceData).length > 0) {
        await tx.projectGovernance.upsert({
          where: { projectId },
          create: { projectId, ...governanceData },
          update: governanceData
        });
      }
    });

    return this.get(id);
  }

  async archive(id: string, userId: string) {
    const projectId = this.parseId(id, 'project id');
    const actorId = this.parseId(userId, 'user id');
    await this.ensureProjectAccess(projectId, actorId);

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { governance: true }
    });
    if (!project) throw new NotFoundException('Project not found');

    const usage = await this.getProjectUsage(id);
    if (usage.open_requests > 0) {
      throw new BadRequestException('Cannot archive project with open requests');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.project.update({
        where: { id: projectId },
        data: {
          isActive: false,
          updatedBy: actorId
        }
      });

      await tx.projectGovernance.upsert({
        where: { projectId },
        create: {
          projectId,
          governanceStatus: 'archived'
        },
        update: {
          governanceStatus: 'archived'
        }
      });
    });

    return this.get(id);
  }

  async unarchive(id: string, userId: string) {
    const projectId = this.parseId(id, 'project id');
    const actorId = this.parseId(userId, 'user id');
    await this.ensureProjectAccess(projectId, actorId);

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { governance: true }
    });
    if (!project) throw new NotFoundException('Project not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.project.update({
        where: { id: projectId },
        data: {
          isActive: true,
          updatedBy: actorId
        }
      });

      const gov = project.governance;
      if (gov && gov.governanceStatus === 'archived') {
        await tx.projectGovernance.update({
          where: { projectId },
          data: { governanceStatus: 'active' }
        });
      }
    });

    return this.get(id);
  }

  async governance(id: string) {
    const project = await this.get(id);
    const usage = await this.getProjectUsage(id);
    return {
      project,
      usage
    };
  }

  async addMember(id: string, actorId: string, dto: AddProjectMemberDto) {
    const projectId = this.parseId(id, 'project id');
    const actor = this.parseId(actorId, 'user id');
    await this.ensureProjectAccess(projectId, actor);

    const userId = this.parseId(dto.user_id, 'user id');
    const profile = await this.prisma.profile.findUnique({ where: { id: userId } });
    if (!profile) throw new NotFoundException('User not found');

    const role = (dto.role ?? 'member') as GroupUserRole;

    await this.prisma.projectMember.upsert({
      where: {
        unique_project_user: {
          projectId,
          userId
        }
      },
      update: { role, addedBy: actor },
      create: {
        projectId,
        userId,
        role,
        addedBy: actor
      }
    });

    return this.get(id);
  }

  async removeMember(id: string, actorId: string, userId: string) {
    const projectId = this.parseId(id, 'project id');
    const actor = this.parseId(actorId, 'user id');
    await this.ensureProjectAccess(projectId, actor);

    await this.prisma.projectMember.delete({
      where: {
        unique_project_user: {
          projectId,
          userId: this.parseId(userId, 'user id')
        }
      }
    });

    return this.get(id);
  }

  private async ensureProjectAccess(projectId: bigint, actorId: bigint) {
    const membership = await this.prisma.projectMember.findFirst({
      where: {
        projectId,
        userId: actorId,
        role: { in: [GroupUserRole.admin, GroupUserRole.moderator] }
      }
    });

    if (!membership) {
      throw new BadRequestException('Only project admins/moderators can perform this action');
    }
  }

  private serializeProject(project: any) {
    const gov = project.governance;
    return {
      ...project,
      governance: {
        project_code: gov?.projectCode ?? null,
        owner_user_id: gov?.ownerUserId ? String(gov.ownerUserId) : null,
        start_date: gov?.startDate ? gov.startDate.toISOString().split('T')[0] : null,
        end_date: gov?.endDate ? gov.endDate.toISOString().split('T')[0] : null,
        governance_status: gov?.governanceStatus ?? (project.isActive ? 'active' : 'archived')
      }
    };
  }

  private async getProjectUsage(id: string) {
    const projectId = this.parseId(id, 'project id');
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true }
    });
    if (!project) throw new NotFoundException('Project not found');

    const requests = await this.prisma.requestInstance.findMany({
      where: { data: { not: Prisma.DbNull } },
      select: { id: true, status: true, data: true }
    });

    let total = 0;
    let open = 0;
    for (const row of requests) {
      if (!row.data || typeof row.data !== 'object' || Array.isArray(row.data)) continue;
      const data = row.data as Record<string, unknown>;
      const projectIdInData = String(data.project_id ?? '');
      const projectNameInData = String(data.project ?? '');
      const matched = projectIdInData === id || projectNameInData.toLowerCase() === String(project.name).toLowerCase();
      if (!matched) continue;
      total += 1;
      if (!['completed', 'rejected', 'cancelled'].includes(String(row.status))) open += 1;
    }

    return {
      request_references: total,
      open_requests: open
    };
  }

  private parseId(value: string, label: string): bigint {
    try {
      return toBigInt(value);
    } catch {
      throw new BadRequestException(`Invalid ${label}`);
    }
  }
}
