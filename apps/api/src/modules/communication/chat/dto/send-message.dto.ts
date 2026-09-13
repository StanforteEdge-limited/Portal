import { IsArray, IsOptional, IsString, ValidateIf } from 'class-validator';

export class SendMessageDto {
  @ValidateIf((o) => o.file_asset_ids === undefined || o.file_asset_ids.length === 0)
  @IsString()
  body?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  file_asset_ids?: string[];

  @IsOptional()
  @IsString()
  reply_to_message_id?: string;
}