import { IsObject, IsOptional, IsString } from 'class-validator';

export class CreateAuditEventDto {
  @IsString()
  instance_id!: string;

  @IsString()
  action!: string;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}
