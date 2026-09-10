import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateOnboardingDto {
  @ApiPropertyOptional({ enum: ['complete_step', 'save_profile', 'save_contacts'] })
  @IsString()
  @IsIn(['complete_step', 'save_profile', 'save_contacts'])
  action!: 'complete_step' | 'save_profile' | 'save_contacts';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  step_key?: string;

  @ApiPropertyOptional()
  @IsOptional()
  payload?: Record<string, unknown>;
}

export class SubmitOnboardingFormDto {
  @ApiPropertyOptional()
  @IsString()
  form_id!: string;

  @ApiPropertyOptional()
  @IsOptional()
  payload?: Record<string, unknown>;
}

export class SaveEmployeeContactsDto {
  @ApiPropertyOptional({ type: [Object] })
  @IsArray()
  contacts!: Array<Record<string, unknown>>;
}
