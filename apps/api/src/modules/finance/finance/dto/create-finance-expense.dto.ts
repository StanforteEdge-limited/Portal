import { IsString, IsOptional, IsNumber, IsEnum, MaxLength, IsDateString, IsUUID } from 'class-validator';

export class CreateFinanceExpenseDto {
  @IsOptional()
  @IsUUID()
  contactId?: string;

  @IsString()
  accountId!: string;

  @IsOptional()
  @IsString()
  chartAccountId?: string;

  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsString()
  teamId?: string;

  @IsOptional()
  @IsString()
  fundId?: string;

  @IsOptional()
  @IsString()
  grantId?: string;

  @IsDateString()
  expenseDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  category?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  amount!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber()
  taxAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;

  @IsOptional()
  @IsString()
  receiptFileId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(['draft', 'submitted', 'approved', 'paid', 'void'])
  status?: string;
}
