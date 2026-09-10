import { IsOptional, IsString } from 'class-validator';

export class UpdateDocumentStatusDto {
  @IsString()
  status!: string;

  @IsOptional()
  @IsString()
  resolution_notes?: string;
}
