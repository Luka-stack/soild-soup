import { Injectable } from '@nestjs/common';
import { WebSocketServer } from '@nestjs/websockets';
import type { RtpCapabilities } from 'mediasoup/node/lib/types';
import { Server, Socket } from 'socket.io';

import { SocketException } from '../types';
import { ConnectTransportDto } from './dto/connect-transport.dto';
import { JoinDto } from './dto/join-room.dto';
import { ProduceDto } from './dto/produce.dto';
import { MsPeer } from './entities/ms-peer';
import { MsRoom } from './entities/ms-room';

@Injectable()
export class SignalingService {
  private msRooms: Map<string, MsRoom>;

  constructor() {
    this.msRooms = new Map();
  }

  joinRoom(
    { username, roomName, createRoom }: JoinDto,
    client: Socket,
  ): Promise<RtpCapabilities | SocketException> {
    if (createRoom && this.msRooms.has(roomName)) {
      return new Promise((resolve) => {
        resolve({
          error: 'Room Error',
          message: ['Room already exists'],
        });
      });
    }

    if (!this.msRooms.has(roomName)) {
      this.msRooms.set(roomName, new MsRoom(roomName));

      this.broadcast(client, 'rooms', this.getRoomNames());
    }

    const peer = new MsPeer(username);
    this.msRooms.get(roomName).addPeer(peer);

    client.data.roomName = roomName;

    return this.msRooms.get(roomName).getRouterCapabilities();
  }

  async createWebRtcTransport(socket: Socket) {
    const roomName = socket.data.roomName;

    if (!roomName || !this.msRooms.has(roomName)) {
      return new Promise((resolve) => {
        resolve({
          error: 'Room Error',
          message: ["Room doesn't exist"],
        });
      });
    }

    try {
      return this.msRooms.get(roomName).createWebRtcTransport(socket.id);
    } catch (error: any) {
      return new Promise((resolve) => {
        resolve({
          error: 'Transport Error',
          message: [error.message],
        });
      });
    }
  }

  async connectTransport(
    data: ConnectTransportDto,
    socket: Socket,
  ): Promise<void | SocketException> {
    const roomName = socket.data.roomName;

    if (!roomName || !this.msRooms.has(roomName)) {
      return new Promise((resolve) => {
        resolve({
          error: 'Room Error',
          message: ["Room doesn't exist"],
        });
      });
    }

    try {
      await this.msRooms.get(roomName).connectTransport(socket.id, data);
    } catch (error) {
      return new Promise((resolve) => {
        resolve({
          error: 'Connection Error',
          message: [error.message],
        });
      });
    }
  }

  async produce(
    data: ProduceDto,
    socket: Socket,
  ): Promise<string | SocketException> {
    const roomName = socket.data.roomName;

    if (!roomName || !this.msRooms.has(roomName)) {
      return new Promise((resolve) => {
        resolve({
          error: 'Room Error',
          message: ["Room doesn't exist"],
        });
      });
    }

    const producerId = await this.msRooms
      .get(roomName)
      .produce(socket.id, data);
    // Broadcast producer

    return producerId;
  }

  getRoomNames(): string[] {
    const rooms: string[] = [];

    for (const room of this.msRooms.values()) {
      rooms.push(room.name);
    }

    return rooms;
  }

  broadcast(socket: Socket, event: string, payload: any): void {
    socket.broadcast.emit(event, payload);
  }
}
