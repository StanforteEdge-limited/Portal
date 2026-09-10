import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { toBigInt } from '../../common/utils/ids';
import { SubmitOnboardingFormDto, UpdateOnboardingDto } from './dto/onboarding.dto';

@Injectable()
export class OnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyOnboarding(profileId: string) {
    const userId = toBigInt(profileId);
    const user = await this.prisma.profile.findUnique({
      where: { id: userId },
      include: {
        employeeProfile: true,
        onboardingProgress: true,
        organizations: { include: { organization: true } },
        roles: { include: { role: true } }
      }
    });

    if (!user) throw new NotFoundException('User not found');

    const roleSlugs = user.roles.map((row) => row.role.slug);
    const emergencyContactsMeta = await this.prisma.employeeMeta.findUnique({
      where: {
        employee_meta_unique: {
          userId: user.id,
          metaKey: 'emergency_contacts'
        }
      }
    });
    const assignments = await this.prisma.formAssignment.findMany({
      where: {
        OR: [{ assignedToProfileId: user.id }, { assignedToRole: { in: roleSlugs } }]
      },
      include: {
        form: {
          select: {
            id: true,
            name: true,
            module: true,
            isActive: true
          }
        }
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }]
    });

    const uniqueForms = Array.from(
      new Map(assignments.filter((a) => a.form.isActive).map((a) => [a.formId, a.form])).values()
    );

    const submissions = await this.prisma.formSubmission.findMany({
      where: {
        submittedByProfileId: user.id,
        formId: { in: uniqueForms.map((f) => f.id) }
      },
      select: {
        id: true,
        formId: true,
        status: true,
        submittedAt: true
      },
      orderBy: { submittedAt: 'desc' }
    });

    const progress =
      user.onboardingProgress ??
      (await this.prisma.onboardingProgress.create({
        data: {
          userId: user.id,
          status: user.status === 'active' ? 'profile_pending' : 'invited',
          currentStep: 'profile'
        }
      }));

    return {
      user: {
        id: user.id.toString(),
        first_name: user.firstName,
        last_name: user.lastName,
        phone: user.phone,
        address: user.address,
        nationality: user.nationality,
        email: user.email,
        status: user.status
      },
      profile: user.employeeProfile,
      emergency_contacts:
        ((emergencyContactsMeta?.metaValue as Record<string, unknown> | null)?.contacts as unknown[]) ?? [],
      progress,
      forms: uniqueForms,
      submissions,
      completion: {
        forms_total: uniqueForms.length,
        forms_submitted: new Set(submissions.map((item) => item.formId)).size
      }
    };
  }

  async updateMyOnboarding(profileId: string, dto: UpdateOnboardingDto) {
    const userId = toBigInt(profileId);

    const user = await this.prisma.profile.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const progress =
      (await this.prisma.onboardingProgress.findUnique({ where: { userId } })) ??
      (await this.prisma.onboardingProgress.create({
        data: {
          userId,
          status: user.status === 'active' ? 'profile_pending' : 'invited',
          currentStep: 'profile'
        }
      }));

    const existingSteps = (progress.stepsJson as Record<string, unknown> | null) ?? {};

    if (dto.action === 'save_profile') {
      const payload = (dto.payload ?? {}) as Record<string, any>;
      await this.prisma.profile.update({
        where: { id: userId },
        data: {
          firstName: payload.first_name ?? user.firstName,
          lastName: payload.last_name ?? user.lastName,
          phone: payload.phone ?? user.phone,
          address: payload.address ?? user.address,
          nationality: payload.nationality ?? user.nationality,
          state: payload.state ?? user.state,
          lga: payload.lga ?? user.lga,
          maritalStatus: payload.marital_status ?? user.maritalStatus
        }
      });

      await this.prisma.onboardingProgress.update({
        where: { userId },
        data: {
          status: 'profile_pending',
          currentStep: 'forms',
          stepsJson: {
            ...existingSteps,
            profile: {
              completed: true,
              at: new Date().toISOString()
            }
          } as Prisma.InputJsonValue
        }
      });

      return this.getMyOnboarding(profileId);
    }

    if (dto.action === 'save_contacts') {
      await this.prisma.employeeMeta.upsert({
        where: {
          employee_meta_unique: {
            userId,
            metaKey: 'emergency_contacts'
          }
        },
        update: {
          metaValue: (dto.payload ?? { contacts: [] }) as Prisma.InputJsonValue
        },
        create: {
          userId,
          metaKey: 'emergency_contacts',
          metaValue: (dto.payload ?? { contacts: [] }) as Prisma.InputJsonValue
        }
      });

      await this.prisma.onboardingProgress.update({
        where: { userId },
        data: {
          status: 'forms_pending',
          currentStep: 'forms',
          stepsJson: {
            ...existingSteps,
            contacts: {
              completed: true,
              at: new Date().toISOString()
            }
          } as Prisma.InputJsonValue
        }
      });

      return this.getMyOnboarding(profileId);
    }

    if (dto.action === 'complete_step') {
      const stepKey = dto.step_key?.trim();
      if (!stepKey) throw new BadRequestException('step_key is required for complete_step action');

      const nextStatus =
        stepKey === 'forms'
          ? 'hr_review'
          : stepKey === 'review'
          ? 'completed'
          : progress.status;

      await this.prisma.onboardingProgress.update({
        where: { userId },
        data: {
          status: nextStatus,
          currentStep: stepKey,
          completedAt: nextStatus === 'completed' ? new Date() : null,
          stepsJson: {
            ...existingSteps,
            [stepKey]: {
              completed: true,
              at: new Date().toISOString()
            }
          } as Prisma.InputJsonValue
        }
      });

      return this.getMyOnboarding(profileId);
    }

    throw new BadRequestException('Unsupported onboarding action');
  }

  async submitForm(profileId: string, dto: SubmitOnboardingFormDto) {
    const userId = toBigInt(profileId);

    const form = await this.prisma.form.findUnique({ where: { id: dto.form_id } });
    if (!form || !form.isActive) throw new NotFoundException('Form not found');
    const fields = await this.prisma.formField.findMany({
      where: { formId: form.id },
      orderBy: { displayOrder: 'asc' }
    });

    const count = await this.prisma.formSubmission.count({ where: { formId: form.id } });
    const submissionNumber = `FM-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    const submission = await this.prisma.formSubmission.create({
      data: {
        formId: form.id,
        submissionNumber,
        submittedByProfileId: userId,
        status: 'submitted'
      }
    });

    const payload = (dto.payload ?? {}) as Record<string, unknown>;
    for (const field of fields) {
      const raw = payload[field.fieldKey];
      if (
        field.isRequired &&
        (raw === undefined || raw === null || (typeof raw === 'string' && raw.trim() === ''))
      ) {
        throw new BadRequestException(`Missing required field: ${field.fieldKey}`);
      }

      if (raw === undefined || raw === null || raw === '') continue;

      if (field.fieldType === 'document_acknowledgement') {
        const fieldOptions =
          field.fieldOptions && typeof field.fieldOptions === 'object' && !Array.isArray(field.fieldOptions)
            ? (field.fieldOptions as Record<string, unknown>)
            : {};
        const documentId = String(fieldOptions.document_id ?? '');
        if (!documentId) {
          throw new BadRequestException(`Field ${field.fieldKey} is missing document_id binding`);
        }

        const doc = await this.prisma.document.findUnique({
          where: { id: documentId },
          select: { id: true, version: true }
        });
        if (!doc) throw new BadRequestException(`Bound document does not exist for ${field.fieldKey}`);

        const boolValue = raw === true || String(raw).toLowerCase() === 'true' || String(raw) === '1';
        if (!boolValue) throw new BadRequestException(`Field ${field.fieldKey} must be acknowledged`);

        await this.prisma.documentAcknowledgement.upsert({
          where: {
            unique_document_ack: {
              documentId: doc.id,
              userId,
              version: doc.version
            }
          },
          update: { acknowledgedAt: new Date() },
          create: {
            documentId: doc.id,
            userId,
            version: doc.version,
            acknowledgedAt: new Date()
          }
        });
      }

      await this.prisma.formSubmissionData.create({
        data: {
          submissionId: submission.id,
          fieldId: field.id,
          fieldKey: field.fieldKey,
          ...this.mapFieldValue(field.fieldType, raw)
        }
      });
    }

    await this.prisma.formSubmissionHistory.create({
      data: {
        submissionId: submission.id,
        actionType: 'submit',
        performedByProfileId: userId,
        notes: dto.payload ? JSON.stringify(dto.payload) : null
      }
    });

    const progress = await this.prisma.onboardingProgress.findUnique({ where: { userId } });
    if (progress) {
      const steps = (progress.stepsJson as Record<string, unknown> | null) ?? {};
      await this.prisma.onboardingProgress.update({
        where: { userId },
        data: {
          status: 'forms_pending',
          currentStep: 'forms',
          stepsJson: {
            ...steps,
            forms: {
              touched: true,
              at: new Date().toISOString()
            }
          } as Prisma.InputJsonValue
        }
      });
    }

    return {
      submission_id: submission.id,
      submission_number: submission.submissionNumber,
      status: submission.status
    };
  }

  private mapFieldValue(fieldType: string, value: unknown) {
    const normalizedType = fieldType.toLowerCase();

    if (normalizedType === 'number' || normalizedType === 'currency') {
      const numeric = Number(value);
      if (Number.isNaN(numeric)) throw new BadRequestException(`Expected number for field type ${fieldType}`);
      return { valueNumber: numeric };
    }

    if (normalizedType === 'date') {
      const dt = new Date(String(value));
      if (Number.isNaN(dt.getTime())) throw new BadRequestException('Invalid date value');
      return { valueDate: dt };
    }

    if (normalizedType === 'datetime') {
      const dt = new Date(String(value));
      if (Number.isNaN(dt.getTime())) throw new BadRequestException('Invalid datetime value');
      return { valueDatetime: dt };
    }

    if (normalizedType === 'file' || normalizedType === 'attachment') {
      return { valueFileUrl: String(value) };
    }

    return { valueText: String(value) };
  }
}
