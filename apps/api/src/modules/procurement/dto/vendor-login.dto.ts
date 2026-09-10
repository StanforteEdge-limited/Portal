import { IsString, IsNotEmpty, IsEmail, IsOptional } from 'class-validator';

export class VendorLoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class VendorAcknowledgeDto {
  @IsOptional()
  @IsString()
  note?: string;
}
