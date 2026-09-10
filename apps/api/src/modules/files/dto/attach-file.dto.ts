import { IsNumber, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AttachFileDto {
  @ApiPropertyOptional({ example: 'local' })
  @IsOptional()
  @IsString()
  storage_disk?: string;

  @ApiProperty({ example: 'uploads/requests/invoice-2026-02-17-001.pdf' })
  @IsString()
  storage_path!: string;

  @ApiProperty({ example: 'invoice-feb.pdf' })
  @IsString()
  file_name!: string;

  @ApiPropertyOptional({ example: 'application/pdf' })
  @IsOptional()
  @IsString()
  mime_type?: string;

  @ApiPropertyOptional({ example: 245899 })
  @IsOptional()
  @IsNumber()
  file_size?: number;

  @ApiPropertyOptional({ example: 'https://cdn.stanforteedge.com/uploads/invoice-feb.pdf' })
  @IsOptional()
  @IsString()
  file_url?: string;

  @ApiPropertyOptional({ example: '4a1401ea-5148-4aea-9478-f9191ea31c35' })
  @IsOptional()
  @IsUUID()
  organization_id?: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    example: { source: 'request_item', tag: 'invoice' }
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
