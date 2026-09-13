import { IsObject, IsOptional, IsString } from 'class-validator';

export class CreateAuditEventDto {
  @IsString()
  entity_type!: string;

  @IsString()
  entity_id!: string;

  @IsString()
  action!: string;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}