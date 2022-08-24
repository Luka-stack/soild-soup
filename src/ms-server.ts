import { Server, Socket } from 'socket.io';
import type { Server as HttpServer } from 'http';
import { MsRoom } from './ms-room';
import { MsPeer } from './ms-peer';
import { RtpCapabilities } from 'mediasoup/node/lib/RtpParameters';
import {
  ConsumeParams,
  ConsumerParams,
  ProduceParams,
  TransportParams,
} from './types';
import { DtlsParameters } from 'mediasoup/node/lib/WebRtcTransport';
import { socketPromise } from '../client/src/lib/socket/socket-promise';

export class MsServer {
  private _server: Server;
  private _msRooms: Map<String, MsRoom>;

  constructor(httpServer: HttpServer) {
    this._msRooms = new Map();
    this._server = new Server(httpServer, {
      cors: {
        origin: '*',
      },
      // options
    });

    this.initListeners();
  }

  getRooms(): string[] {
    const rooms = [];
    for (const room of this._msRooms.values()) {
      rooms.push(room.name);
    }

    return ['Room 1', 'Room 2', 'Room 3', 'Room 4', 'Room 5'];
  }

  joinRoom(socket: Socket, roomName: string, nickname: string): void {
    let msRoom = this._msRooms.get(roomName);

    if (!msRoom) {
      msRoom = new MsRoom(roomName);
    }

    const peer = new MsPeer(socket.id, nickname);
    msRoom.addPeer(peer);
    socket.data.roomName = roomName;

    socket.emit('joined_room', msRoom.getRouterCapabilities());
  }

  async onCreateWebRtcTransport(
    socket: Socket,
    callback: (params: TransportParams) => void
  ): Promise<void> {
    const roomName = socket.data.roomName;
    if (!this._msRooms.has(roomName)) {
      console.log(
        `--- [onCreateWebRtcTransport] room ${roomName} doesnt exist ---`
      );
      return;
    }

    try {
      const params = await this._msRooms
        .get(roomName)!
        .createWebRtcTransport(socket.id);
      callback(params);
    } catch (error) {
      console.log(`--- [onCreateWebRtcTransport] ${error} ---`);
    }
  }

  async onConnectTransport(
    socket: Socket,
    params: any,
    callback: (error?: Error) => void
  ): Promise<void> {
    const roomName = socket.data.roomName;
    if (!this._msRooms.has(roomName)) {
      console.log(`--- [onConnectTransport] room ${roomName} doesnt exist ---`);
      return;
    }

    try {
      await this._msRooms.get(roomName)!.connectTransport(socket.id, params);
      callback();
    } catch (error) {
      callback(error as Error);
    }
  }

  async onProduce(
    socket: Socket,
    params: ProduceParams,
    callback: (producerId: string) => void
  ): Promise<void> {
    const roomName = socket.data.roomName;
    if (!this._msRooms.has(roomName)) {
      console.log(`--- [onConnectTransport] room ${roomName} doesnt exist ---`);
      return;
    }

    const producerId = await this._msRooms
      .get(roomName)!
      .produce(socket.id, params);

    callback(producerId);
  }

  async onConsume(
    socket: Socket,
    params: ConsumeParams,
    callback: (params: ConsumerParams) => void
  ): Promise<void> {
    const roomName = socket.data.roomName;
    if (!this._msRooms.has(roomName)) {
      console.log(`--- [onConsume] room ${roomName} doesnt exist ---`);
      return;
    }

    try {
      const consumerParams = await this._msRooms
        .get(roomName)!
        .consume(socket.id, params);
      callback(consumerParams);
    } catch (error) {
      // TODO send error
    }
  }

  initListeners() {
    this._server.on('connection', (socket) => {
      socket.on('startSession', () => {
        console.log(`--- Socket ${socket.id} connected to server ---`);

        socket.emit('rooms', this.getRooms());
      });

      socket.on('join', (roomName, nickname) => {
        this.joinRoom(socket, roomName, nickname);
      });

      // CLEAN MEDIASOUP COMUNICATION

      socket.on('create_webrtc_transport', (callback) => {
        this.onCreateWebRtcTransport(socket, callback);
      });

      socket.on('connect_transport', (params, callback) => {
        this.onConnectTransport(socket, params, callback);
      });

      socket.on('produce', (params, callback) => {
        this.onProduce(socket, params, callback);
      });

      socket.on('consume', (params, callback) => {
        this.onConsume(socket, params, callback);
      });

      // ----------------------------

      socket.on('disconnect', () => {
        console.log(`--- Socket ${socket.id} disconnected from server ---`);
      });
    });
  }
}
