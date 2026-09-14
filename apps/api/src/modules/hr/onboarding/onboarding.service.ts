import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, count, desc, eq, inArray, or } from 'drizzle-orm';
import { DbService } from '$common/db/db.service';
import { toBigInt } from '$common/utils/ids';
import { organization, profileOrganization } from '$modules/directory/organizations/model';
import { employeeMeta, employeeProfile, onboardingProgress } from '$modules/hr/hr/model';
import { role, userRole } from '$modules/identity/rbac/model';
import { profile } from '$modules/identity/users/model';
import { document, documentAcknowledgement } from '$modules/requests/documents/model';
import {
  form,
  formAssignment,
  formField,
  formSubmission,
  formSubmissionData,
  formSubmissionHistory,
} from '$modules/requests/forms/model';
import { SubmitOnboardingFormDto, UpdateOnboardingDto } from '$modules/hr/onboarding/dto/onboarding.dto';

@Injectable()
export class OnboardingService {
  constructor(private readonly db: DbService) {}

  async getMyOnboarding(profileId: string) {
    const userId = toBigInt(profileId);
    const user = await this.findUserWithOnboarding(userId);

    if (!user) throw new NotFoundException('User not found');

    const roleSlugs = user.roles.map((row) => row.role.slug);
    const [emergencyContactsMeta] = await this.db.client
      .select()
      .from(employeeMeta)
      .where(and(eq(employeeMeta.userId, user.id), eq(employeeMeta.metaKey, 'emergency_contacts')))
      .limit(1);
    const assignments = await this.db.client
      .select({
        formId: formAssignment.formId,
        form: { id: form.id, name: form.name, module: form.module, isActive: form.isActive },
      })
      .from(formAssignment)
      .innerJoin(form, eq(formAssignment.formId, form.id))
      .where(or(
        eq(formAssignment.assignedToProfileId, user.id),
        roleSlugs.length > 0 ? inArray(formAssignment.assignedToRole, roleSlugs) : undefined,
      ))
      .orderBy(asc(formAssignment.dueDate), asc(formAssignment.createdAt));

    const uniqueForms = Array.from(
      new Map<string, any>(assignments.filter((a) => a.form.isActive).map((a) => [a.formId, a.form])).values()
    );

    const submissions = uniqueForms.length === 0
      ? []
      : await this.db.client
          .select({
            id: formSubmission.id,
            formId: formSubmission.formId,
            status: formSubmission.status,
            submittedAt: formSubmission.submittedAt,
          })
          .from(formSubmission)
          .where(and(
            eq(formSubmission.submittedByProfileId, user.id),
            inArray(formSubmission.formId, uniqueForms.map((f) => f.id)),
          ))
          .orderBy(desc(formSubmission.submittedAt));

    const progress =
      user.onboardingProgress ??
      (await this.createOnboardingProgress({
          userId: user.id,
          status: user.status === 'active' ? 'profile_pending' : 'invited',
          currentStep: 'profile'
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

    const user = await this.findUser(userId);
    if (!user) throw new NotFoundException('User not found');

    const progress =
      (await this.findOnboardingProgress(userId)) ??
      (await this.createOnboardingProgress({
          userId,
          status: user.status === 'active' ? 'profile_pending' : 'invited',
          currentStep: 'profile'
        }));

    const existingSteps = (progress.stepsJson as Record<string, unknown> | null) ?? {};

    if (dto.action === 'save_profile') {
      const payload = (dto.payload ?? {}) as Record<string, any>;
      await this.db.client.update(profile)
        .set({
          firstName: payload.first_name ?? user.firstName,
          lastName: payload.last_name ?? user.lastName,
          phone: payload.phone ?? user.phone,
          address: payload.address ?? user.address,
          nationality: payload.nationality ?? user.nationality,
          state: payload.state ?? user.state,
          lga: payload.lga ?? user.lga,
          maritalStatus: payload.marital_status ?? user.maritalStatus
        })
        .where(eq(profile.id, userId));

      await this.db.client.update(onboardingProgress)
        .set({
          status: 'profile_pending',
          currentStep: 'forms',
          stepsJson: {
            ...existingSteps,
            profile: {
              completed: true,
              at: new Date().toISOString()
            }
          }
        })
        .where(eq(onboardingProgress.userId, userId));

      return this.getMyOnboarding(profileId);
    }

    if (dto.action === 'save_contacts') {
      await this.db.client.insert(employeeMeta)
        .values({
          userId,
          metaKey: 'emergency_contacts',
          metaValue: dto.payload ?? { contacts: [] },
        })
        .onConflictDoUpdate({
          target: [employeeMeta.userId, employeeMeta.metaKey],
          set: { metaValue: dto.payload ?? { contacts: [] } },
        });

      await this.db.client.update(onboardingProgress)
        .set({
          status: 'forms_pending',
          currentStep: 'forms',
          stepsJson: {
            ...existingSteps,
            contacts: {
              completed: true,
              at: new Date().toISOString()
            }
          }
        })
        .where(eq(onboardingProgress.userId, userId));

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

      await this.db.client.update(onboardingProgress)
        .set({
          status: nextStatus,
          currentStep: stepKey,
          completedAt: nextStatus === 'completed' ? new Date() : null,
          stepsJson: {
            ...existingSteps,
            [stepKey]: {
              completed: true,
              at: new Date().toISOString()
            }
          }
        })
        .where(eq(onboardingProgress.userId, userId));

      return this.getMyOnboarding(profileId);
    }

    throw new BadRequestException('Unsupported onboarding action');
  }

  async submitForm(profileId: string, dto: SubmitOnboardingFormDto) {
    const userId = toBigInt(profileId);

    const [formRecord] = await this.db.client.select().from(form).where(eq(form.id, dto.form_id)).limit(1);
    if (!formRecord || !formRecord.isActive) throw new NotFoundException('Form not found');
    const fields = await this.db.client
      .select()
      .from(formField)
      .where(eq(formField.formId, formRecord.id))
      .orderBy(asc(formField.displayOrder));

    const [{ value }] = await this.db.client
      .select({ value: count() })
      .from(formSubmission)
      .where(eq(formSubmission.formId, formRecord.id));
    const submissionNumber = `FM-${new Date().getFullYear()}-${String(value + 1).padStart(5, '0')}`;

    const [submission] = await this.db.client
      .insert(formSubmission)
      .values({
        formId: formRecord.id,
        submissionNumber,
        submittedByProfileId: userId,
        status: 'submitted'
      })
      .returning();

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

        const [doc] = await this.db.client
          .select({ id: document.id, version: document.version })
          .from(document)
          .where(eq(document.id, documentId))
          .limit(1);
        if (!doc) throw new BadRequestException(`Bound document does not exist for ${field.fieldKey}`);

        const boolValue = raw === true || String(raw).toLowerCase() === 'true' || String(raw) === '1';
        if (!boolValue) throw new BadRequestException(`Field ${field.fieldKey} must be acknowledged`);

        await this.db.client.insert(documentAcknowledgement)
          .values({
            documentId: doc.id,
            userId,
            version: doc.version,
            acknowledgedAt: new Date()
          })
          .onConflictDoUpdate({
            target: [documentAcknowledgement.documentId, documentAcknowledgement.userId, documentAcknowledgement.version],
            set: { acknowledgedAt: new Date() },
          });
      }

      await this.db.client.insert(formSubmissionData).values({
          submissionId: submission.id,
          fieldId: field.id,
          fieldKey: field.fieldKey,
          ...this.mapFieldValue(field.fieldType, raw)
      });
    }

    await this.db.client.insert(formSubmissionHistory).values({
        submissionId: submission.id,
        actionType: 'submit',
        performedByProfileId: userId,
        notes: dto.payload ? JSON.stringify(dto.payload) : null
    });

    const progress = await this.findOnboardingProgress(userId);
    if (progress) {
      const steps = (progress.stepsJson as Record<string, unknown> | null) ?? {};
      await this.db.client.update(onboardingProgress)
        .set({
          status: 'forms_pending',
          currentStep: 'forms',
          stepsJson: {
            ...steps,
            forms: {
              touched: true,
              at: new Date().toISOString()
            }
          }
        })
        .where(eq(onboardingProgress.userId, userId));
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
      return { valueNumber: String(numeric) };
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

  private async findUser(userId: bigint) {
    const [user] = await this.db.client.select().from(profile).where(eq(profile.id, userId)).limit(1);
    return user ?? null;
  }

  private async findUserWithOnboarding(userId: bigint) {
    const user = await this.findUser(userId);
    if (!user) return null;

    const [employee] = await this.db.client.select().from(employeeProfile).where(eq(employeeProfile.userId, user.id)).limit(1);
    const progress = await this.findOnboardingProgress(user.id);
    const organizations = await this.db.client
      .select({ membership: profileOrganization, organization })
      .from(profileOrganization)
      .leftJoin(organization, eq(profileOrganization.organizationId, organization.id))
      .where(eq(profileOrganization.profileId, user.id));
    const roles = await this.db.client
      .select({ role })
      .from(userRole)
      .innerJoin(role, eq(userRole.roleId, role.id))
      .where(eq(userRole.profileId, user.id));

    return {
      ...user,
      employeeProfile: employee ?? null,
      onboardingProgress: progress,
      organizations,
      roles,
    };
  }

  private async findOnboardingProgress(userId: bigint) {
    const [progress] = await this.db.client
      .select()
      .from(onboardingProgress)
      .where(eq(onboardingProgress.userId, userId))
      .limit(1);
    return progress ?? null;
  }

  private async createOnboardingProgress(values: typeof onboardingProgress.$inferInsert) {
    const [progress] = await this.db.client.insert(onboardingProgress).values(values).returning();
    return progress;
  }
}
