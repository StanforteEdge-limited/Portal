import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

class UpsertFinanceBudgetLineDto {
  @ApiPropertyOptional({ example: 'income' })
  @IsOptional()
  @IsString()
  section?: string;

  @ApiPropertyOptional({ example: 'Programme Costs' })
  @IsOptional()
  @IsString()
  group_name?: string;

  @ApiPropertyOptional({ example: 'Equipment and field materials' })
  @IsOptional()
  @IsString()
  line_name?: string;

  @ApiPropertyOptional({ example: 'Equipment and field materials' })
  @IsOptional()
  @IsString()
  line_label?: string;

  @ApiPropertyOptional({ example: 'acc-123' })
  @IsOptional()
  @IsUUID()
  chart_account_id?: string;

  @ApiPropertyOptional({ example: '7' })
  @IsOptional()
  @IsString()
  project_id?: string;

  @ApiPropertyOptional({ example: 'a4c5ad31-9200-4701-a019-b5ca8f9c6167' })
  @IsOptional()
  @IsUUID()
  fund_id?: string;

  @ApiPropertyOptional({ example: '5d28da17-d0ef-4d00-bf6c-efc5e9efbb62' })
  @IsOptional()
  @IsUUID()
  grant_id?: string;

  @ApiPropertyOptional({ example: 500000 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  amount?: number;

  @ApiPropertyOptional({ example: 100000 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  period_1_amount?: number;

  @ApiPropertyOptional({ example: 100000 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  period_2_amount?: number;

  @ApiPropertyOptional({ example: 150000 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  period_3_amount?: number;

  @ApiPropertyOptional({ example: 150000 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  period_4_amount?: number;

  @ApiPropertyOptional({ example: 500000 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  total_amount?: number;

  @ApiPropertyOptional({ example: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  sort_order?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

class UpsertFinanceBudgetAssumptionDto {
  @ApiPropertyOptional({ example: 'macro' })
  @IsOptional()
  @IsString()
  section?: string;

  @ApiProperty({ example: 'Exchange Rate' })
  @IsString()
  label!: string;

  @ApiProperty({ example: '1 USD = 1500 NGN' })
  @IsString()
  value!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  sort_order?: number;
}

class UpsertFinanceBudgetPortfolioDto {
  @ApiProperty({ example: '7' })
  @IsString()
  project_id!: string;

  @ApiPropertyOptional({ example: 'a4c5ad31-9200-4701-a019-b5ca8f9c6167' })
  @IsOptional()
  @IsUUID()
  fund_id?: string;

  @ApiPropertyOptional({ example: '5d28da17-d0ef-4d00-bf6c-efc5e9efbb62' })
  @IsOptional()
  @IsUUID()
  grant_id?: string;

  @ApiPropertyOptional({ example: 'UNICEF' })
  @IsOptional()
  @IsString()
  funder_name?: string;

  @ApiPropertyOptional({ example: 'active' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 100000 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  period_1_amount?: number;

  @ApiPropertyOptional({ example: 100000 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  period_2_amount?: number;

  @ApiPropertyOptional({ example: 150000 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  period_3_amount?: number;

  @ApiPropertyOptional({ example: 150000 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  period_4_amount?: number;

  @ApiPropertyOptional({ example: 500000 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  period_total?: number;

  @ApiPropertyOptional({ example: 1200000 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  total_budget?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  sort_order?: number;
}

export class UpsertFinanceBudgetDto {
  @ApiProperty({ example: '2026 Organization Annual Budget' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: 'organization' })
  @IsOptional()
  @IsString()
  scope_type?: string;

  @ApiPropertyOptional({ example: 'organization' })
  @IsOptional()
  @IsString()
  budget_type?: string;

  @ApiPropertyOptional({ example: 'annual' })
  @IsOptional()
  @IsString()
  period_type?: string;

  @ApiPropertyOptional({ example: 2026 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  fiscal_year?: number;

  @ApiPropertyOptional({ example: 1 })
  @Type(() => Number)
  @IsOptional()
  @Min(1)
  @Max(4)
  quarter?: number;

  @ApiPropertyOptional({ example: 3 })
  @Type(() => Number)
  @IsOptional()
  @Min(1)
  @Max(12)
  month?: number;

  @ApiPropertyOptional({ example: 'NGN' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/, { message: 'currency must be 3-letter ISO code' })
  currency?: string;

  @ApiPropertyOptional({ example: 1500 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  exchange_rate?: number;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiPropertyOptional({ example: 'draft' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: '1' })
  @IsOptional()
  @IsString()
  organization_id?: string;

  @ApiPropertyOptional({ example: '4' })
  @IsOptional()
  @IsString()
  team_id?: string;

  @ApiPropertyOptional({ example: '7' })
  @IsOptional()
  @IsString()
  project_id?: string;

  @ApiPropertyOptional({ example: 'budget-parent-uuid' })
  @IsOptional()
  @IsUUID()
  parent_budget_id?: string;

  @ApiPropertyOptional({ example: 'a4c5ad31-9200-4701-a019-b5ca8f9c6167' })
  @IsOptional()
  @IsUUID()
  fund_id?: string;

  @ApiPropertyOptional({ example: '5d28da17-d0ef-4d00-bf6c-efc5e9efbb62' })
  @IsOptional()
  @IsUUID()
  grant_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  justification?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  submission_note?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  supporting_file_ids?: string[];

  @ApiPropertyOptional({ type: [UpsertFinanceBudgetAssumptionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpsertFinanceBudgetAssumptionDto)
  assumptions?: UpsertFinanceBudgetAssumptionDto[];

  @ApiPropertyOptional({ type: [UpsertFinanceBudgetPortfolioDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpsertFinanceBudgetPortfolioDto)
  portfolio?: UpsertFinanceBudgetPortfolioDto[];

  @ApiProperty({ type: [UpsertFinanceBudgetLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpsertFinanceBudgetLineDto)
  lines!: UpsertFinanceBudgetLineDto[];
}
