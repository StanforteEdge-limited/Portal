import { IsOptional, IsString } from 'class-validator';

export class ReviewAttendanceExceptionDto {
  @IsOptional()
  @IsString()
  review_notes?: string;
}
