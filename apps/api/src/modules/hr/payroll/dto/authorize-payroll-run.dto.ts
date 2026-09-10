import { IsOptional, IsString } from 'class-validator';

export class AuthorizePayrollRunDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
