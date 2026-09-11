import { IsString, Matches } from 'class-validator';

export class ChangeSubscriptionDto {
  @IsString()
  @Matches(/^[a-z0-9][a-z0-9_-]{1,49}$/)
  plan: string;
}
