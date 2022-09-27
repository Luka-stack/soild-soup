import { UseFilters, UsePipes, ValidationPipe } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import type { Socket } from 'socket.io';

import { AllExceptionsFilter } from '../common/filters/all-exceptions-filter';
import { ConnectTransportDto } from './dto/connect-transport.dto';
import { ConsumeDto } from './dto/consume.dto';
import { JoinDto } from './dto/join-room.dto';
import { ProduceDto } from './dto/produce.dto';
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

  @SubscribeMessage('start_session')
  onStartSession(@ConnectedSocket() client: Socket) {
    const rooms = this.signalingService.getRoomNames();
    client.emit('rooms', rooms);
  }

  @SubscribeMessage('create_webrtc_transport')
  onCreateWebRtcTransport(@ConnectedSocket() client: Socket) {
    return this.signalingService.createWebRtcTransport(client);
  }

  @SubscribeMessage('connect_transport')
  onConnectTransport(
    @MessageBody() data: ConnectTransportDto,
    @ConnectedSocket() client: Socket,
  ) {
    return this.signalingService.connectTransport(data, client);
  }

  @SubscribeMessage('produce')
  onProduce(
    @MessageBody() data: ProduceDto,
    @ConnectedSocket() client: Socket,
  ) {
    return this.signalingService.produce(data, client);
  }

  @SubscribeMessage('get_producers')
  onGetProducers(@ConnectedSocket() client: Socket) {
    return this.signalingService.getProducers(client);
  }

  @SubscribeMessage('consume')
  onConsume(
    @MessageBody() data: ConsumeDto,
    @ConnectedSocket() client: Socket,
  ) {
    return this.signalingService.consume(data, client);
  }
}
