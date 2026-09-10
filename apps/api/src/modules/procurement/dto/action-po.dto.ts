import { IsString, IsOptional } from 'class-validator';

export class ActionPoDto {
  @IsOptional()
  @IsString()
  comment?: string;
}
