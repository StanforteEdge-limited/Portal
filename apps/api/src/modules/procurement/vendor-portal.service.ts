import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { VendorLoginDto, VendorAcknowledgeDto } from './dto/vendor-login.dto';

@Injectable()
export class VendorPortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: VendorLoginDto) {
    const user = await this.prisma.vendorPortalUser.findUnique({ where: { email: dto.email } });
    if (!user || !user.hashedPassword) throw new UnauthorizedException('Invalid credentials');
    const valid = await bcrypt.compare(dto.password, user.hashedPassword);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    await this.prisma.vendorPortalUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const token = this.jwtService.sign(
      { sub: user.id, vendorId: user.vendorId, aud: 'vendor-portal' },
      { expiresIn: '8h' },
    );
    return { token, name: user.name, vendorId: user.vendorId };
  }

  async listOrders(vendorId: string) {
    return this.prisma.procurementOrder.findMany({
      where: { vendorId, status: { not: 'draft' } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrder(id: string, vendorId: string) {
    const po = await this.prisma.procurementOrder.findFirst({
      where: { id, vendorId },
      include: {
        attachments: {
          where: { visibility: 'vendor' },
          include: { file: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!po) throw new NotFoundException('Order not found');
    return po;
  }

  async acknowledge(id: string, vendorId: string, dto: VendorAcknowledgeDto) {
    const po = await this.getOrder(id, vendorId);
    if (po.vendorAcknowledgedAt) throw new UnauthorizedException('Already acknowledged');
    return this.prisma.procurementOrder.update({
      where: { id },
      data: { vendorAcknowledgedAt: new Date(), vendorAcknowledgeNote: dto.note ?? null, status: 'acknowledged' },
    });
  }
}
