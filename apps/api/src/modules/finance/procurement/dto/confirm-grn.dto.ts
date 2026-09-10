import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';

export class ConfirmGrnDto {
  @IsEnum(['confirmed', 'disputed'])
  status!: 'confirmed' | 'disputed';

  @IsOptional()
  @IsString()
  comment?: string;
}
