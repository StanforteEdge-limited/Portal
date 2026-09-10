import { ArrayMinSize, IsArray, IsNumber, IsUUID, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class PVDeductionLineDto {
  @ApiProperty({ example: 'f3e8b369-0eca-454f-a8f8-46b780bc6264' })
  @IsUUID()
  deduction_type_id!: string;

  @ApiProperty({ example: 0.05 })
  @IsNumber()
  rate!: number;

  @ApiProperty({ example: 500000 })
  @IsNumber()
  gross_amount!: number;

  @ApiProperty({ example: 25000 })
  @IsNumber()
  deduction_amount!: number;
}

export class ApplyPVDeductionsDto {
  @ApiProperty({ type: [PVDeductionLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PVDeductionLineDto)
  deductions!: PVDeductionLineDto[];
}
