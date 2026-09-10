import { Body, Controller, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Permissions } from '../../common/auth/permissions.decorator';
import { PermissionsGuard } from '../../common/auth/permissions.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiTags('Notifications')
@ApiBearerAuth('bearer')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(@Req() req: any, @Query('status') status?: 'read' | 'unread') {
    return this.notificationsService.listForUser(req.user.id, status);
  }

  @Post()
  @Permissions('send_notifications')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', example: '1' },
        type: { type: 'string', example: 'info' },
        title: { type: 'string', example: 'Request Approved' },
        message: { type: 'string', example: 'Your request #1001 has been approved.' },
        data: { type: 'object' }
      },
      required: ['userId', 'title', 'message']
    }
  })
  create(@Body() body: any) {
    return this.notificationsService.create(body);
  }

  @Get('unread-count')
  unreadCount(@Req() req: any) {
    return this.notificationsService.unreadCount(req.user.id);
  }

  @Get(':id')
  getOne(@Req() req: any, @Param('id') id: string) {
    return this.notificationsService.getOneForUser(req.user.id, id);
  }

  @Put(':id/read')
  markRead(@Req() req: any, @Param('id') id: string) {
    return this.notificationsService.markRead(req.user.id, id);
  }

  @Put('mark-all-read')
  markAllRead(@Req() req: any) {
    return this.notificationsService.markAllRead(req.user.id);
  }
}
