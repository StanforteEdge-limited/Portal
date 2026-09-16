import { IsArray, IsNumber, IsObject, IsOptional, IsString, Matches, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

class RequestItemDto {
  @ApiPropertyOptional({ example: 'Diesel purchase for project vehicle' })
  @IsString()
  description!: string;

  @ApiPropertyOptional({ example: 25000 })
  @IsNumber()
  amount!: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  quantity?: number;

  @ApiPropertyOptional({ example: '2d4a8405-1f45-4f7f-b4fe-b535566f8549' })
  @IsOptional()
  @IsUUID()
  category_id?: string;

  @ApiPropertyOptional({ example: '67b7c17f-80ca-4443-a3f4-cc694fd476d7' })
  @IsOptional()
  @IsUUID()
  subcategory_id?: string;

  @ApiPropertyOptional({ example: '2026-02-20' })
  @IsOptional()
  @IsString()
  due_date?: string;

  @ApiPropertyOptional({ example: 'Adjusted after vendor quote' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 'f3e8b369-0eca-454f-a8f8-46b780bc6264' })
  @IsOptional()
  @IsUUID()
  file_id?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  file_ids?: string[];

  @ApiPropertyOptional({ example: 'GTBank' })
  @IsOptional()
  @IsString()
  bank_name?: string;

  @ApiPropertyOptional({ example: '0123456789' })
  @IsOptional()
  @IsString()
  account_number?: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  account_name?: string;
}

export class UpdateRequestDto {
  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    example: { purpose: 'Updated purpose', reimbursement: true, budget_id: 'approved-budget-uuid', budget_line_id: 'approved-line-uuid' }
  })
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @ApiPropertyOptional({ example: '12' })
  @IsOptional()
  @IsString()
  @Matches(/^\d+$/, { message: 'team_id must be a numeric group id' })
  team_id?: string;

  @ApiPropertyOptional({ example: '5' })
  @IsOptional()
  @IsString()
  @Matches(/^\d+$/, { message: 'organization_id must be a numeric id' })
  organization_id?: string;

  @ApiPropertyOptional({ example: 75000 })
  @IsOptional()
  @IsNumber()
  total_amount?: number;

  @ApiPropertyOptional({ example: 'NGN' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ type: [RequestItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RequestItemDto)
  items?: RequestItemDto[];
}
