import { IsArray, IsString } from 'class-validator';

export class UpdateFieldOptionsDto {
  @IsArray()
  @IsString({ each: true })
  options!: string[];
}
