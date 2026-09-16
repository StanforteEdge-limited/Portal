import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewLeaveRequestDto {
  @IsIn(['approved', 'rejected'])
  status: 'approved' | 'rejected';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
