import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateLeaveTypeDto {
  @IsString()
  @MaxLength(50)
  code: string;

  @IsString()
  @MaxLength(120)
  name: string;

  @IsInt()
  @Min(0)
  annual_entitlement_days: number;

  @IsOptional()
  @IsString()
  metadata?: string;
}
