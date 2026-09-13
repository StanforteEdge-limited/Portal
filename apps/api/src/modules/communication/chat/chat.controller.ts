import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '$common/auth/jwt-auth.guard';
import { PermissionsGuard } from '$common/auth/permissions.guard';
import { ChatService } from './chat.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { UpdateMemberDto } from './dto/update-member.dto';

@Controller('chat')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiTags('Chat')
@ApiBearerAuth('bearer')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('unread-count')
  @ApiOperation({ summary: 'Total unread messages across all conversations' })
  unreadCount(@Req() req: any) {
    return this.chatService.unreadCount(req.user?.id);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'List my conversations with last message and unread counts' })
  conversations(@Req() req: any) {
    return this.chatService.conversations(req.user?.id);
  }

  @Post('conversations')
  @ApiOperation({ summary: 'Create a direct or group conversation and join it as creator' })
  createConversation(@Req() req: any, @Body() dto: CreateConversationDto) {
    return this.chatService.createConversation(req.user?.id, dto);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get conversation detail and members' })
  detail(@Req() req: any, @Param('id') id: string) {
    return this.chatService.detail(req.user?.id, id);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Paginated messages in a conversation (newest first, use before_id cursor)' })
  messages(@Req() req: any, @Param('id') id: string, @Query() query: Record<string, any>) {
    return this.chatService.messages(req.user?.id, id, query);
  }

  @Post('conversations/:id/messages')
  @ApiOperation({ summary: 'Send a message with optional file attachments' })
  sendMessage(@Req() req: any, @Param('id') id: string, @Body() dto: SendMessageDto) {
    return this.chatService.sendMessage(req.user?.id, id, dto);
  }

  @Post('conversations/:id/read')
  @ApiOperation({ summary: 'Mark all messages in a conversation as read' })
  markRead(@Req() req: any, @Param('id') id: string) {
    return this.chatService.markRead(req.user?.id, id);
  }

  @Post('conversations/:id/members')
  @ApiOperation({ summary: 'Add members to a group conversation' })
  addMembers(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { member_ids: string[] }
  ) {
    return this.chatService.addMembers(req.user?.id, id, body?.member_ids ?? []);
  }

  @Patch('conversations/:id/members/:profile_id')
  @ApiOperation({ summary: 'Update a member role (admin only)' })
  updateMemberRole(
    @Req() req: any,
    @Param('id') id: string,
    @Param('profile_id') profileId: string,
    @Body() dto: UpdateMemberDto
  ) {
    return this.chatService.updateMemberRole(req.user?.id, id, profileId, dto);
  }

  @Delete('conversations/:id/members/:profile_id')
  @ApiOperation({ summary: 'Remove a member from a group conversation (admin only)' })
  removeMember(@Req() req: any, @Param('id') id: string, @Param('profile_id') profileId: string) {
    return this.chatService.removeMember(req.user?.id, id, profileId);
  }

  @Post('conversations/:id/leave')
  @ApiOperation({ summary: 'Leave a conversation' })
  leave(@Req() req: any, @Param('id') id: string) {
    return this.chatService.leave(req.user?.id, id);
  }
}