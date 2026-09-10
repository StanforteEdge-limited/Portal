import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class AttachProcurementFileDto {
  @IsString()
  fileId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  label?: string;

  @IsIn(['internal', 'vendor'])
  visibility!: 'internal' | 'vendor';
}
