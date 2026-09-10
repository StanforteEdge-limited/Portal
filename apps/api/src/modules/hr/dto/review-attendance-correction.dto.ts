import { IsOptional, IsString } from 'class-validator';

export class ReviewAttendanceCorrectionDto {
  @IsOptional()
  @IsString()
  review_notes?: string;
}
