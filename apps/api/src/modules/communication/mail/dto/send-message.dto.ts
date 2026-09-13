import { IsString, IsEmail, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty()
  @IsEmail()
  to!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  cc?: string[];

  @ApiProperty()
  @IsString()
  subject!: string;

  @ApiProperty({ description: 'HTML body content' })
  @IsString()
  body!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  inReplyToUid?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  folder?: string;
}
