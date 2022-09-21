import { UseFilters, UsePipes, ValidationPipe } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import type { Socket } from 'socket.io';

import { AllExceptionsFilter } from '../common/filters/all-exceptions-filter';
import { JoinDto } from './dto/join-room.dto';
import { SignalingService } from './signaling.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
@UsePipes(new ValidationPipe())
@UseFilters(new AllExceptionsFilter())
export class SignalingGateway {
  constructor(private readonly signalingService: SignalingService) {}

  @SubscribeMessage('join')
  onJoin(@MessageBody() data: JoinDto, @ConnectedSocket() client: Socket) {
    return this.signalingService.joinRoom(data, client);
  }
}
