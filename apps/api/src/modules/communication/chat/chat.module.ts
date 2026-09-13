import { Module } from '@nestjs/common';
import { AuthModule } from '$modules/identity/auth/auth.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatRealtimeService } from './chat-realtime.service';
import { PresenceService } from './presence.service';
import { ChatGateway } from './chat.gateway';

@Module({
  imports: [AuthModule],
  controllers: [ChatController],
  providers: [ChatService, ChatRealtimeService, PresenceService, ChatGateway],
  exports: [ChatService, ChatRealtimeService, PresenceService],
})
export class ChatModule {}