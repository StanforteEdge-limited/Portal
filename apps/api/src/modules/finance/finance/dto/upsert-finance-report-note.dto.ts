import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpsertFinanceReportNoteDto {
  @ApiProperty({ example: '8a0d59b7-9d8a-41d8-a4dd-8d5fd9beeb3c' })
  @IsUUID()
  period_id!: string;

  @ApiProperty({ example: 'executive-summary' })
  @IsString()
  report_key!: string;

  @ApiPropertyOptional({ enum: ['generated', 'manual'] })
  @IsOptional()
  @IsString()
  @IsIn(['generated', 'manual'])
  kind?: string;

  @ApiPropertyOptional({ enum: ['info', 'warning', 'critical'] })
  @IsOptional()
  @IsString()
  @IsIn(['info', 'warning', 'critical'])
  severity?: string;

  @ApiProperty({ example: 'Receivables rising' })
  @IsString()
  title!: string;

  @ApiProperty({ example: 'Outstanding receivables increased by 22% over prior period.' })
  @IsString()
  body!: string;

  @ApiPropertyOptional({ example: 'large_unpaid_receivables' })
  @IsOptional()
  @IsString()
  source_rule?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  is_overridden?: boolean;
}
