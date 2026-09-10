import { Controller, Post, Get, Param, Body, Req, UseGuards } from '@nestjs/common';
import { VendorPortalService } from './vendor-portal.service';
import { VendorLoginDto, VendorAcknowledgeDto } from './dto/vendor-login.dto';
import { VendorJwtGuard } from './guards/vendor-jwt.guard';

@Controller('vendor-portal')
export class VendorPortalController {
  constructor(private readonly service: VendorPortalService) {}

  @Post('login')
  login(@Body() dto: VendorLoginDto) {
    return this.service.login(dto);
  }

  @UseGuards(VendorJwtGuard)
  @Get('orders')
  listOrders(@Req() req: any) {
    return this.service.listOrders(req.vendor.vendorId);
  }

  @UseGuards(VendorJwtGuard)
  @Get('orders/:id')
  getOrder(@Param('id') id: string, @Req() req: any) {
    return this.service.getOrder(id, req.vendor.vendorId);
  }

  @UseGuards(VendorJwtGuard)
  @Post('orders/:id/acknowledge')
  acknowledge(@Param('id') id: string, @Req() req: any, @Body() dto: VendorAcknowledgeDto) {
    return this.service.acknowledge(id, req.vendor.vendorId, dto);
  }
}
