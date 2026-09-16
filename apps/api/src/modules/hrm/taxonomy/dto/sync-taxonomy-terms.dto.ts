import { IsArray, IsString } from 'class-validator';

export class SyncTaxonomyTermsDto {
  @IsArray()
  @IsString({ each: true })
  terms!: string[];
}

