import { IsString, IsNotEmpty, IsEnum, IsOptional, IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class PoItemDto {
  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsNumber()
  qty!: number;

  @IsString()
  @IsNotEmpty()
  unit!: string;

  @IsNumber()
  unitCost!: number;
}

export class MilestoneDto {
  @IsNumber()
  seq!: number;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsNumber()
  percentage!: number;

  @IsNumber()
  amount!: number;

  @IsString()
  @IsNotEmpty()
  trigger!: 'po_approved' | 'grn_confirmed' | 'manual_signoff';
}

export class CreatePoDto {
  @IsOptional()
  @IsString()
  caseId?: string;

  @IsOptional()
  @IsString()
  requisitionId?: string;

  @IsString()
  @IsNotEmpty()
  vendorId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PoItemDto)
  items!: PoItemDto[];

  @IsEnum(['post_delivery', 'pre_payment', 'milestone'])
  paymentPattern!: 'post_delivery' | 'pre_payment' | 'milestone';

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MilestoneDto)
  milestones?: MilestoneDto[];

  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @IsOptional()
  @IsString()
  deliveryDate?: string;

  @IsOptional()
  @IsString()
  deliveryAddress?: string;

  @IsNotEmpty()
  approvalFlowJson: any;
}
