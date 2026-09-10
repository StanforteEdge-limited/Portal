import { IsString, IsOptional } from 'class-validator';

export class ActionPrDto {
  @IsOptional()
  @IsString()
  comment?: string;
}
