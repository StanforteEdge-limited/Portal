import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAcknowledgementDto {
  @ApiProperty({ description: 'Subject type, e.g. policy, handbook, document, form' })
  @IsString()
  @MaxLength(60)
  subject_type!: string;

  @ApiProperty({ description: 'Subject identifier in its own domain' })
  @IsString()
  @MaxLength(191)
  subject_id!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  subject_label?: string;

  @ApiPropertyOptional({ description: 'Version key of the subject' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  version?: string;

  @ApiPropertyOptional({ description: 'Optional form submission source id' })
  @IsOptional()
  @IsString()
  source_form_submission_id?: string;

  @ApiPropertyOptional({ description: 'Arbitrary metadata for acknowledgement context' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
