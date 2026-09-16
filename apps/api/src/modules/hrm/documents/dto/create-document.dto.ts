import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateDocumentDto {
  @ApiProperty()
  @IsString()
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(180)
  slug?: string;

  @ApiPropertyOptional({ default: 'policy' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @ApiPropertyOptional({ default: 'draft' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  status?: string;

  @ApiPropertyOptional({ default: '1.0' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  version?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effective_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content_html?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  file_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  link_url?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  require_acknowledgement?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  organization_id?: string;
}
