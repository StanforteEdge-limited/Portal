import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

export class AssignEmployeeOrganizationDto {
  @ApiProperty()
  @IsString()
  organization_id!: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  is_primary?: boolean;
}

export class AssignEmployeeTeamDto {
  @ApiProperty()
  @IsString()
  team_id!: string;

  @ApiPropertyOptional({ enum: ['member', 'lead', 'manager'], default: 'member' })
  @IsOptional()
  @IsIn(['member', 'lead', 'manager'])
  role?: 'member' | 'lead' | 'manager';
}

export class AssignOnboardingFormDto {
  @ApiProperty()
  @IsString()
  form_id!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  profile_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  role_slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  due_date?: string;
}

export class UpdateOnboardingFormAssignmentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  form_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  profile_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  role_slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  due_date?: string;
}
