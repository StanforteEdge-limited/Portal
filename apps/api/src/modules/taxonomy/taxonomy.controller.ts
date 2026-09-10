import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Permissions } from '../../common/auth/permissions.decorator';
import { PermissionsGuard } from '../../common/auth/permissions.guard';
import { CreateTaxonomyDto } from './dto/create-taxonomy.dto';
import { SyncTaxonomyTermsDto } from './dto/sync-taxonomy-terms.dto';
import { UpdateTaxonomyDto } from './dto/update-taxonomy.dto';
import { UpdateFieldOptionsDto } from './dto/update-field-options.dto';
import { UpsertTagTermDto } from './dto/upsert-tag-term.dto';
import { ReplaceEntityTagsDto } from './dto/replace-entity-tags.dto';
import { TaxonomyService } from './taxonomy.service';

@Controller('taxonomy')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiTags('Taxonomy')
@ApiBearerAuth('bearer')
export class TaxonomyController {
  constructor(private readonly taxonomyService: TaxonomyService) {}

  @Get()
  @Permissions('requests.view')
  list(@Query() query: Record<string, any>) {
    return this.taxonomyService.list(query);
  }

  @Get('taxonomies')
  @Permissions('requests.view')
  listTaxonomies(@Query() query: Record<string, any>) {
    return this.taxonomyService.listTaxonomies(query);
  }

  @Post('taxonomies')
  @Permissions('settings.manage')
  createTaxonomy(@Body() dto: CreateTaxonomyDto) {
    return this.taxonomyService.createTaxonomy(dto);
  }

  @Post('taxonomies/:id')
  @Permissions('settings.manage')
  updateTaxonomy(@Param('id') id: string, @Body() dto: UpdateTaxonomyDto) {
    return this.taxonomyService.updateTaxonomy(id, dto);
  }

  @Delete('taxonomies/:id')
  @Permissions('settings.manage')
  deleteTaxonomy(@Param('id') id: string) {
    return this.taxonomyService.deleteTaxonomy(id);
  }

  @Post('taxonomies/:id/terms/sync')
  @Permissions('settings.manage')
  syncTaxonomyTerms(@Param('id') id: string, @Body() dto: SyncTaxonomyTermsDto) {
    return this.taxonomyService.syncTerms(id, dto);
  }

  @Post('form-fields/:fieldId/options')
  @Permissions('settings.manage')
  updateFieldOptions(@Param('fieldId') fieldId: string, @Body() dto: UpdateFieldOptionsDto) {
    return this.taxonomyService.updateFieldOptions(fieldId, dto);
  }

  @Get('tags/:taxonomyKey/suggest')
  @Permissions('requests.view')
  suggestTagTerms(@Param('taxonomyKey') taxonomyKey: string, @Query('q') query?: string) {
    return this.taxonomyService.suggestTagTerms(taxonomyKey, query);
  }

  @Post('tags/:taxonomyKey/terms')
  @Permissions('requests.create')
  upsertTagTerm(@Param('taxonomyKey') taxonomyKey: string, @Body() dto: UpsertTagTermDto, @Query('module') module?: string) {
    return this.taxonomyService.upsertTagTerm(taxonomyKey, dto, module);
  }

  @Get('tags/:entityType/:entityId/:taxonomyKey')
  @Permissions('requests.view')
  listEntityTags(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Param('taxonomyKey') taxonomyKey: string
  ) {
    return this.taxonomyService.listEntityTags(entityType, entityId, taxonomyKey);
  }

  @Post('tags/:entityType/:entityId/:taxonomyKey')
  @Permissions('requests.create')
  replaceEntityTags(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Param('taxonomyKey') taxonomyKey: string,
    @Body() dto: ReplaceEntityTagsDto,
    @Query('module') module?: string,
    @Req() req?: any
  ) {
    return this.taxonomyService.replaceEntityTags(entityType, entityId, taxonomyKey, dto, module, req?.user?.id);
  }
}
