import { IsOptional, IsString } from 'class-validator';

export class SubmitRequestDto {
  @IsOptional()
  @IsString()
  comment?: string;
}
