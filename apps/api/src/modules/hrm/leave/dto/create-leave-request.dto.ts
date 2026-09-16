import { IsDateString, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateLeaveRequestDto {
  @IsString()
  leave_type_id: string;

  @IsDateString()
  start_date: string;

  @IsDateString()
  end_date: string;

  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  reason: string;
}
