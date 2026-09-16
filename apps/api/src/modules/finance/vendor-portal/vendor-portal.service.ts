import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { and, asc, desc, eq, ne } from 'drizzle-orm';
import { DbService } from '$common/db/db.service';
import * as bcrypt from 'bcryptjs';
import { VendorLoginDto, VendorAcknowledgeDto } from './dto/vendor-login.dto';
import { fileAsset } from '$modules/storage/model';
import { procurementAttachment, procurementOrder } from '$modules/finance/procurement/model';
import { vendorPortalUser } from './model';

@Injectable()
export class VendorPortalService {
  constructor(
    private readonly db: DbService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: VendorLoginDto) {
    const [user] = await this.db.client
      .select()
      .from(vendorPortalUser)
      .where(eq(vendorPortalUser.email, dto.email))
      .limit(1);
    if (!user || !user.hashedPassword) throw new UnauthorizedException('Invalid credentials');
    const valid = await bcrypt.compare(dto.password, user.hashedPassword);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    await this.db.client
      .update(vendorPortalUser)
      .set({ lastLoginAt: new Date() })
      .where(eq(vendorPortalUser.id, user.id));
    const token = this.jwtService.sign(
      { sub: user.id, vendorId: user.vendorId, aud: 'vendor-portal' },
      { expiresIn: '8h' },
    );
    return { token, name: user.name, vendorId: user.vendorId };
  }

  async listOrders(vendorId: string) {
    return this.db.client
      .select()
      .from(procurementOrder)
      .where(and(eq(procurementOrder.vendorId, vendorId), ne(procurementOrder.status, 'draft')))
      .orderBy(desc(procurementOrder.createdAt));
  }

  async getOrder(id: string, vendorId: string) {
    const [po] = await this.db.client
      .select()
      .from(procurementOrder)
      .where(and(eq(procurementOrder.id, id), eq(procurementOrder.vendorId, vendorId)))
      .limit(1);
    if (!po) throw new NotFoundException('Order not found');
    const attachments = await this.db.client
      .select({ attachment: procurementAttachment, file: fileAsset })
      .from(procurementAttachment)
      .leftJoin(fileAsset, eq(procurementAttachment.fileId, fileAsset.id))
      .where(and(eq(procurementAttachment.orderId, po.id), eq(procurementAttachment.visibility, 'vendor')))
      .orderBy(asc(procurementAttachment.createdAt));
    return {
      ...po,
      attachments: attachments.map(({ attachment, file }) => ({ ...attachment, file })),
    };
  }

  async acknowledge(id: string, vendorId: string, dto: VendorAcknowledgeDto) {
    const po = await this.getOrder(id, vendorId);
    if (po.vendorAcknowledgedAt) throw new UnauthorizedException('Already acknowledged');
    const [updated] = await this.db.client
      .update(procurementOrder)
      .set({ vendorAcknowledgedAt: new Date(), vendorAcknowledgeNote: dto.note ?? null, status: 'acknowledged' })
      .where(and(eq(procurementOrder.id, id), eq(procurementOrder.vendorId, vendorId)))
      .returning();
    return updated;
  }
}
