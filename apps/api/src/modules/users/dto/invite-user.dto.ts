import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class InviteUserDto {
  @ApiPropertyOptional({ example: 'Welcome to StanforteEdge. Use this link to activate your account.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}

