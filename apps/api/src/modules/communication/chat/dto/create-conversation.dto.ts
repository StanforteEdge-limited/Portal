import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';

export class CreateConversationDto {
  @IsIn(['direct', 'group'])
  type: 'direct' | 'group' = 'direct';

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  member_ids!: string[];
}