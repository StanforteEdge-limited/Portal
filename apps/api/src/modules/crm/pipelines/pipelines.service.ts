import { Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { TenantContextService } from '$common/auth/tenant-context.service';
import { DbService } from '$common/db/db.service';
import { parseBigIntId } from '$common/utils/ids';
import { crmOpportunity } from '../opportunities/model';
import { ReplaceCrmPipelineStagesDto, UpsertCrmPipelineDto } from './dto/upsert-pipeline.dto';
import { crmPipeline, crmPipelineStage } from './model';

@Injectable()
export class CrmPipelinesService {
  constructor(
    private readonly db: DbService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async listPipelines() {
    const tid = this.tenantContext.requireTenantId();
    const pipelines = await this.db.client
      .select()
      .from(crmPipeline)
      .where(eq(crmPipeline.tenantId, tid))
      .orderBy(desc(crmPipeline.isDefault), asc(crmPipeline.createdAt));
    if (!pipelines.length) {
      const seeded = await this.ensureDefaultPipeline();
      const stages = await this.db.client
        .select()
        .from(crmPipelineStage)
        .where(and(eq(crmPipelineStage.pipelineId, seeded.id), eq(crmPipelineStage.tenantId, tid)))
        .orderBy(asc(crmPipelineStage.position));
      return [{ ...seeded, stages }];
    }

    const pipelineIds = pipelines.map((pipeline) => pipeline.id);
    const stages = await this.db.client
      .select()
      .from(crmPipelineStage)
      .where(and(inArray(crmPipelineStage.pipelineId, pipelineIds), eq(crmPipelineStage.tenantId, tid)))
      .orderBy(asc(crmPipelineStage.position));
    const byPipeline = new Map<string, any[]>();
    for (const stage of stages) {
      const key = stage.pipelineId.toString();
      const bucket = byPipeline.get(key);
      if (bucket) bucket.push(stage);
      else byPipeline.set(key, [stage]);
    }

    return pipelines.map((pipeline) => ({
      ...pipeline,
      stages: byPipeline.get(pipeline.id.toString()) ?? [],
    }));
  }

  async getPipeline(id: string) {
    const tid = this.tenantContext.requireTenantId();
    const pipelineId = id === 'default' ? (await this.ensureDefaultPipeline()).id : parseBigIntId(id, 'pipeline id');
    const [pipeline] = await this.db.client
      .select()
      .from(crmPipeline)
      .where(and(eq(crmPipeline.id, pipelineId), eq(crmPipeline.tenantId, tid)))
      .limit(1);
    if (!pipeline) throw new NotFoundException('Pipeline not found');

    const [stages, opportunities] = await Promise.all([
      this.db.client
        .select()
        .from(crmPipelineStage)
        .where(and(eq(crmPipelineStage.pipelineId, pipelineId), eq(crmPipelineStage.tenantId, tid)))
        .orderBy(asc(crmPipelineStage.position)),
      this.db.client
        .select()
        .from(crmOpportunity)
        .where(and(eq(crmOpportunity.pipelineId, pipelineId), eq(crmOpportunity.tenantId, tid)))
        .orderBy(desc(crmOpportunity.createdAt)),
    ]);

    return { ...pipeline, stages, opportunities };
  }

  async createPipeline(dto: UpsertCrmPipelineDto) {
    const tid = this.tenantContext.requireTenantId();
    const isDefault = dto.is_default === true;
    if (isDefault) {
      await this.db.client
        .update(crmPipeline)
        .set({ isDefault: false })
        .where(and(eq(crmPipeline.isDefault, true), eq(crmPipeline.tenantId, tid)));
    }

    const [pipeline] = await this.db.client
      .insert(crmPipeline)
      .values({
        tenantId: tid,
        name: dto.name,
        description: dto.description,
        isDefault,
      })
      .returning();

    if (dto.stages?.length) {
      await this.db.client.insert(crmPipelineStage).values(
        dto.stages.map((stage, index) => ({
          tenantId: tid,
          pipelineId: pipeline.id,
          name: stage.name,
          position: stage.position ?? index,
          probability: stage.probability ?? 0,
          color: stage.color,
          isWon: stage.is_won ?? false,
          isLost: stage.is_lost ?? false,
        })),
      );
    }

    return this.getPipeline(pipeline.id.toString());
  }

  async updatePipeline(id: string, dto: UpsertCrmPipelineDto) {
    const tid = this.tenantContext.requireTenantId();
    const pipelineId = parseBigIntId(id, 'pipeline id');
    const [existing] = await this.db.client
      .select({ id: crmPipeline.id })
      .from(crmPipeline)
      .where(and(eq(crmPipeline.id, pipelineId), eq(crmPipeline.tenantId, tid)))
      .limit(1);
    if (!existing) throw new NotFoundException('Pipeline not found');

    if (dto.is_default === true) {
      await this.db.client
        .update(crmPipeline)
        .set({ isDefault: false })
        .where(and(eq(crmPipeline.isDefault, true), eq(crmPipeline.tenantId, tid)));
    }

    await this.db.client
      .update(crmPipeline)
      .set({
        name: dto.name,
        description: dto.description,
        isDefault: dto.is_default,
      })
      .where(and(eq(crmPipeline.id, pipelineId), eq(crmPipeline.tenantId, tid)));

    return this.getPipeline(id);
  }

  async replacePipelineStages(id: string, dto: ReplaceCrmPipelineStagesDto) {
    const tid = this.tenantContext.requireTenantId();
    const pipelineId = parseBigIntId(id, 'pipeline id');
    const [existing] = await this.db.client
      .select({ id: crmPipeline.id })
      .from(crmPipeline)
      .where(and(eq(crmPipeline.id, pipelineId), eq(crmPipeline.tenantId, tid)))
      .limit(1);
    if (!existing) throw new NotFoundException('Pipeline not found');

    await this.db.client.transaction(async (tx) => {
      await tx.delete(crmPipelineStage).where(and(eq(crmPipelineStage.pipelineId, pipelineId), eq(crmPipelineStage.tenantId, tid)));
      await tx.insert(crmPipelineStage).values(
        dto.stages.map((stage, index) => ({
          tenantId: tid,
          pipelineId,
          name: stage.name,
          position: stage.position ?? index,
          probability: stage.probability ?? 0,
          color: stage.color,
          isWon: stage.is_won ?? false,
          isLost: stage.is_lost ?? false,
        })),
      );
    });

    return this.getPipeline(id);
  }

  async deletePipeline(id: string) {
    const tid = this.tenantContext.requireTenantId();
    const pipelineId = parseBigIntId(id, 'pipeline id');
    const [deleted] = await this.db.client
      .delete(crmPipeline)
      .where(and(eq(crmPipeline.id, pipelineId), eq(crmPipeline.tenantId, tid)))
      .returning();
    if (!deleted) throw new NotFoundException('Pipeline not found');
    return { success: true };
  }

  private async defaultStages() {
    return [
      { name: 'New', position: 0, probability: 10, isWon: false, isLost: false },
      { name: 'Qualified', position: 1, probability: 40, isWon: false, isLost: false },
      { name: 'Proposal', position: 2, probability: 60, isWon: false, isLost: false },
      { name: 'Negotiation', position: 3, probability: 80, isWon: false, isLost: false },
      { name: 'Won', position: 4, probability: 100, isWon: true, isLost: false },
      { name: 'Lost', position: 5, probability: 0, isWon: false, isLost: true },
    ];
  }

  private async ensureDefaultPipeline() {
    const tid = this.tenantContext.requireTenantId();
    const [existing] = await this.db.client
      .select()
      .from(crmPipeline)
      .where(and(eq(crmPipeline.isDefault, true), eq(crmPipeline.tenantId, tid)))
      .limit(1);
    if (existing) return existing;
    const [first] = await this.db.client
      .select()
      .from(crmPipeline)
      .where(eq(crmPipeline.tenantId, tid))
      .limit(1);
    if (first) return first;

    return this.db.client.transaction(async (tx) => {
      const [pipeline] = await tx.insert(crmPipeline).values({
        tenantId: tid,
        name: 'Default Pipeline',
        description: 'Pipeline seeded by facity CRM',
        isDefault: true,
      }).returning();
      await tx.insert(crmPipelineStage).values(
        (await this.defaultStages()).map((stage) => ({ tenantId: tid, pipelineId: pipeline.id, ...stage })),
      );
      return pipeline;
    });
  }
}
