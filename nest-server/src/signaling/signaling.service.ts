import { Injectable } from '@nestjs/common';
import type { RtpCapabilities } from 'mediasoup/node/lib/types';
import { Socket } from 'socket.io';

import { PeerConsumer, SocketException } from '../types';
import { ConnectTransportDto } from './dto/connect-transport.dto';
import { ConsumeDto } from './dto/consume.dto';
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

    const peer = new MsPeer(client.id, username);
    this.msRooms.get(roomName).addPeer(peer);

    client.data.roomName = roomName;
    client.data.peerId = peer.uuid;
    client.join(roomName);

    return this.msRooms.get(roomName).getRouterCapabilities();
  }

  async createWebRtcTransport(client: Socket) {
    const roomName = client.data.roomName;

    if (!roomName || !this.msRooms.has(roomName)) {
      return new Promise((resolve) => {
        resolve({
          error: 'Room Error',
          message: ["Room doesn't exist"],
        });
      });
    }

    try {
      return this.msRooms
        .get(roomName)
        .createWebRtcTransport(client.data.peerId);
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
    client: Socket,
  ): Promise<void | SocketException> {
    const roomName = client.data.roomName;

    if (!roomName || !this.msRooms.has(roomName)) {
      return new Promise((resolve) => {
        resolve({
          error: 'Room Error',
          message: ["Room doesn't exist"],
        });
      });
    }

    try {
      await this.msRooms
        .get(roomName)
        .connectTransport(client.data.peerId, data);
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
    client: Socket,
  ): Promise<string | SocketException> {
    const roomName = client.data.roomName;

    if (!roomName || !this.msRooms.has(roomName)) {
      return new Promise((resolve) => {
        resolve({
          error: 'Room Error',
          message: ["Room doesn't exist"],
        });
      });
    }

    const peerProducer = await this.msRooms
      .get(roomName)
      .produce(client.data.peerId, data);

    this.broadcastToRoom(client, 'new_producers', [peerProducer]);

    return peerProducer.producers[0].id;
  }

  consume(
    data: ConsumeDto,
    client: Socket,
  ): Promise<PeerConsumer | SocketException> {
    const roomName = client.data.roomName;

    if (!roomName || !this.msRooms.has(roomName)) {
      return new Promise((resolve) => {
        resolve({
          error: 'Room Error',
          message: ["Room doesn't exist"],
        });
      });
    }

    try {
      return this.msRooms.get(roomName).consume(client.data.peerId, data);
    } catch (error) {
      return new Promise((resolve) => {
        resolve({
          error: 'Consume Error',
          message: [error.message],
        });
      });
    }
  }

  getProducers(client: Socket) {
    const roomName = client.data.roomName;

    if (!roomName || !this.msRooms.has(roomName)) {
      return new Promise((resolve) => {
        resolve({
          error: 'Room Error',
          message: ["Room doesn't exist"],
        });
      });
    }

    const producers = this.msRooms
      .get(roomName)
      .getPeerProducers(client.data.peerId);

    client.emit('new_producers', producers);
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

  broadcastToRoom(socket: Socket, event: string, payload: any): void {
    const roomName = socket.data.roomName;

    if (roomName) {
      socket.to(roomName).emit(event, payload);
    }
  }
}
