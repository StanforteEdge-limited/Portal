import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNumber, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class RetireRequestDto {
  @ApiPropertyOptional({ example: '5e33f8b3-4b80-41de-ae11-cd3657f9300f' })
  @IsOptional()
  @IsUUID()
  voucher_id?: string;

  @ApiPropertyOptional({ example: 'Retirement submitted with receipts attached.' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 48000 })
  @IsOptional()
  @IsNumber()
  retired_amount?: number;

  @ApiPropertyOptional({ type: [String], example: ['f3e8b369-0eca-454f-a8f8-46b780bc6264'] })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  retirement_file_ids?: string[];

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    example: { transport: 30000, feeding: 18000 }
  })
  @IsOptional()
  @IsObject()
  breakdown?: Record<string, unknown>;
}
