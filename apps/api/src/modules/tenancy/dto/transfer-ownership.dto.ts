import { IsString } from 'class-validator';

export class TransferOwnershipDto {
  @IsString()
  profile_id!: string;
}