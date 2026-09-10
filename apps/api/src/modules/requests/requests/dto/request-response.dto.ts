import { ApiProperty } from '@nestjs/swagger';

export class RequestItemFileResponseDto {
  @ApiProperty()
  id!: string;
  @ApiProperty()
  file_name!: string;
  @ApiProperty({ nullable: true })
  mime_type!: string | null;
  @ApiProperty({ nullable: true })
  public_url!: string | null;
  @ApiProperty({ nullable: true })
  storage_path!: string | null;
}

export class RequestItemResponseDto {
  @ApiProperty()
  id!: string;
  @ApiProperty()
  description!: string;
  @ApiProperty({ example: 12000 })
  amount!: number;
  @ApiProperty({ example: 1 })
  quantity!: number;
  @ApiProperty({ nullable: true })
  category_id!: string | null;
  @ApiProperty({ nullable: true })
  subcategory_id!: string | null;
  @ApiProperty({ nullable: true })
  due_date!: Date | null;
  @ApiProperty({ nullable: true })
  notes!: string | null;
  @ApiProperty({ nullable: true })
  file_id!: string | null;
  @ApiProperty({ type: RequestItemFileResponseDto, nullable: true })
  file!: RequestItemFileResponseDto | null;
  @ApiProperty({ type: RequestItemFileResponseDto, isArray: true })
  files!: RequestItemFileResponseDto[];
}

export class RequestResponseDto {
  @ApiProperty({ example: '1001' })
  id!: string;
  @ApiProperty({ example: 'draft' })
  status!: string;
  @ApiProperty()
  request_type_id!: string;
  @ApiProperty()
  group_id!: string;
  @ApiProperty({ nullable: true })
  organization_id!: string | null;
  @ApiProperty({ nullable: true })
  workflow_instance_id!: string | null;
  @ApiProperty()
  created_by!: string;
  @ApiProperty({ nullable: true })
  team_id!: string | null;
  @ApiProperty({ example: 'NGN' })
  currency!: string;
  @ApiProperty({ example: 'PC/2026/1001' })
  request_number!: string;
  @ApiProperty({ nullable: true, example: 'PV/2026/1001' })
  voucher_number!: string | null;
  @ApiProperty({ nullable: true, example: 45000 })
  total_amount!: number | null;
  @ApiProperty({ type: 'object', additionalProperties: true, nullable: true })
  data!: unknown;
  @ApiProperty()
  created_at!: Date;
  @ApiProperty()
  updated_at!: Date;
  @ApiProperty({ required: false })
  request_type?: {
    id: string;
    name: string;
    code_prefix: string;
    taxonomy_keys?: string[] | null;
    approval_flow_json?: unknown;
    form_schema?: unknown;
    category_code?: string | null;
    workflow_type?: string | null;
    handler_role_label?: string | null;
  };
  @ApiProperty({ required: false })
  group?: {
    id: string;
    name: string;
    code: string;
  };
  @ApiProperty({ required: false })
  creator?: {
    id: string;
    username: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
  };
  @ApiProperty({ required: false, nullable: true })
  organization?: {
    id: string;
    name: string;
    code: string;
  } | null;
  @ApiProperty({ required: false, nullable: true })
  team?: {
    id: string;
    name: string;
  } | null;
  @ApiProperty({ type: RequestItemResponseDto, isArray: true })
  items!: RequestItemResponseDto[];
  @ApiProperty({
    required: false,
    type: 'object',
    additionalProperties: true,
    description: 'Approval trail summary (done and pending approvers)'
  })
  approvals?: unknown;
}
