import { Injectable } from '@nestjs/common';
import type { Socket } from 'socket.io';

import { JoinDto } from './dto/join-room.dto';
import { MsPeer } from './entities/ms-peer';
import { MsRoom } from './entities/ms-room';

@Injectable()
export class SignalingService {
  private msRooms: Map<string, MsRoom>;

  constructor() {
    this.msRooms = new Map();
  }

  joinRoom({ username, roomName, createRoom }: JoinDto, client: Socket) {
    console.log(client.data);

    if (createRoom && this.msRooms.has(roomName)) {
      return {
        error: 'Room Error',
        message: ['Room already exists'],
      };
    }

    if (!this.msRooms.has(roomName)) {
      this.msRooms.set(roomName, new MsRoom(roomName));
      // TODO Broadcast rooms
    }

    const peer = new MsPeer(username);
    this.msRooms.get(roomName).addPeer(peer);

    // TODO: Attach roomname to socket
    client.data.roomName = roomName;

    // TODO: Return actual router params
    return { params: 'Router Params' };
  }
}
