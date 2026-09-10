import { IsOptional, IsString } from 'class-validator';

export class UpsertTagTermDto {
  @IsString()
  label!: string;

  @IsOptional()
  @IsString()
  value?: string;
}

