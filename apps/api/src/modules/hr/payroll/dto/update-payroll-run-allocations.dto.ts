import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

class PayrollRunAllocationRowDto {
  @ApiProperty()
  @IsOptional()
  @IsString()
  organization_id?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  team_id?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  project_id?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  fund_id?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  grant_id?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  allocation_percent!: number;

  @ApiProperty()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  allocation_amount?: number;
}

export class UpdatePayrollRunAllocationsDto {
  @ApiProperty({ type: [PayrollRunAllocationRowDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PayrollRunAllocationRowDto)
  allocations!: PayrollRunAllocationRowDto[];
}
