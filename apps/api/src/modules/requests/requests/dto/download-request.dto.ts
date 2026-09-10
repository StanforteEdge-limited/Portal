import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class DownloadRequestDto {
  @ApiPropertyOptional({
    enum: ['request_pdf', 'pv_pdf', 'request_with_attachments', 'pv_with_attachments', 'full_package', 'full_document', 'certificate_of_honor_pdf'],
    default: 'request_pdf'
  })
  @IsOptional()
  @IsIn(['request_pdf', 'pv_pdf', 'request_with_attachments', 'pv_with_attachments', 'full_package', 'full_document', 'certificate_of_honor_pdf'])
  action?: 'request_pdf' | 'pv_pdf' | 'request_with_attachments' | 'pv_with_attachments' | 'full_package' | 'full_document' | 'certificate_of_honor_pdf';

  @ApiPropertyOptional({ description: 'Required for pv_pdf (specific voucher) and pv_with_attachments' })
  @IsOptional()
  @IsUUID()
  voucher_id?: string;

  @ApiPropertyOptional({ enum: ['download', 'email'], default: 'download' })
  @IsOptional()
  @IsIn(['download', 'email'])
  delivery?: 'download' | 'email';

  @ApiPropertyOptional({ format: 'email' })
  @IsOptional()
  @IsString()
  email_to?: string;

  // Certificate of Honor fields
  @IsOptional() @IsString() staff_name?: string;
  @IsOptional() @IsString() request_label?: string;
  @IsOptional() @IsString() voucher_number?: string;
  @IsOptional() @IsString() amount_label?: string;
  @IsOptional() @IsString() declaration?: string;
  @IsOptional() @IsString() reason?: string;
  @IsOptional() @IsString() issued_at?: string;
  @IsOptional() @IsString() signature_file_id?: string;
}
