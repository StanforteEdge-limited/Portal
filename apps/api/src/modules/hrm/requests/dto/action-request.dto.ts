import { IsOptional, IsString } from 'class-validator';

export class ActionRequestDto {
  @IsString()
  action!: string;

  @IsOptional()
  @IsString()
  comment?: string;
}
