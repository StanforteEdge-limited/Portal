import { IsOptional, IsString } from 'class-validator';

export class CreateProcurementCaseDto {
  @IsOptional()
  @IsString()
  note?: string;
}
