import { IsArray, IsBoolean, IsNumber, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTypeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  category_id?: string;

  @ApiPropertyOptional({ example: 'OP' })
  @IsOptional()
  @IsString()
  code_prefix?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: ['finance_operational'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  taxonomy_keys?: string[];

  @ApiPropertyOptional({ enum: ['json', 'form', 'special', 'bypass'], example: 'json' })
  @IsOptional()
  @IsString()
  storage_type?: 'json' | 'form' | 'special' | 'bypass';

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    example: { project_required: true, reimbursement_allowed: true }
  })
  @IsOptional()
  @IsObject()
  form_schema?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  form_id?: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    example: {
      steps: [
        { approver: { type: 'relation', value: 'requester_team_lead' } },
        { approver: { type: 'permission', value: 'finance.approve' } },
        { approver: { type: 'office', value: 'coo' }, min_amount: 500000 }
      ]
    }
  })
  @IsOptional()
  @IsObject()
  approval_flow_json?: Record<string, unknown>;

  @ApiPropertyOptional({ example: 500000 })
  @IsOptional()
  @IsNumber()
  approval_limit?: number;

  @ApiPropertyOptional({ example: ['admin', 'finance.approve'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  visible_to_roles?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ enum: ['payment', 'leave', 'loan', 'other'], example: 'payment' })
  @IsOptional()
  @IsString()
  workflow_type?: string;

  @ApiPropertyOptional({ example: 'Accountant' })
  @IsOptional()
  @IsString()
  handler_role_label?: string;
}
