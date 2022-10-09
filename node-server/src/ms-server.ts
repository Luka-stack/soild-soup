import { Server, Socket } from 'socket.io';
import type { Server as HttpServer } from 'http';
import { MsRoom } from './ms-room';
import { MsPeer } from './ms-peer';
import {
  ConsumeParams,
  ConsumerParams,
  JoinRoomPayload,
  MediaStreamKind,
  ProduceParams,
  SocketException,
  TransportParams,
} from './types';
import type { RtpCapabilities } from 'mediasoup/node/lib/types';

export class MsServer {
  private server: Server;
  private msRooms: Map<String, MsRoom>;

  constructor(httpServer: HttpServer) {
    this.msRooms = new Map();
    this.server = new Server(httpServer, {
      cors: {
        origin: '*',
      },
      // options
    });

    this.initListeners();
  }

  async joinRoom(
    socket: Socket,
    { username, roomName, createRoom }: JoinRoomPayload,
    callback: (response: SocketException | RtpCapabilities) => void
  ): Promise<void> {
    let msRoom = this.msRooms.get(roomName);

    if (createRoom && msRoom) {
      callback({
        error: 'Room Error',
        message: ['Room already exists'],
      });
      return;
    }

    if (!msRoom) {
      msRoom = new MsRoom(roomName, this.server);
      this.msRooms.set(roomName, msRoom);
      console.log('--- [MsServer]:JoinRoom created new room ', roomName, '---');

      this.broadcastRooms();
    }

    const peer = new MsPeer(socket.id, username);
    msRoom.addPeer(peer);
    socket.data.roomName = roomName;
    socket.data.peerId = peer.uuid;
    socket.join(roomName);

    const routerParams = await msRoom.getRouterCapabilities();
    callback(routerParams);
  }

  broadcastRooms(socket?: Socket) {
    const rooms: string[] = [];

    for (const room of this.msRooms.values()) {
      rooms.push(room.name);
    }

    if (socket) {
      socket.emit('rooms', rooms);
    } else {
      this.server.emit('rooms', rooms);
    }
  }

  async onCreateWebRtcTransport(
    socket: Socket,
    callback: (response: SocketException | TransportParams) => void
  ): Promise<void> {
    const roomName = socket.data.roomName;

    console.log('--- socket.data ---', socket.data);

    if (!this.msRooms.has(roomName)) {
      callback({
        error: 'Room Error',
        message: ["Room doesn't exist"],
      });
      return;
    }

    try {
      const params = await this.msRooms
        .get(roomName)!
        .createWebRtcTransport(socket.id);

      console.log(
        '--- [MsServer]:onCreateWebRtcTransport created tranport ---'
      );

      callback(params);
    } catch (error: any) {
      console.log(`--- [onCreateWebRtcTransport] ${error} ---`);
      callback({
        error: 'Transport Error',
        message: [error.message],
      });
    }
  }

  async onConnectTransport(
    socket: Socket,
    params: any,
    callback: (response: SocketException | boolean) => void
  ): Promise<void> {
    const roomName = socket.data.roomName;
    if (!this.msRooms.has(roomName)) {
      console.log(`--- [onConnectTransport] room ${roomName} doesnt exist ---`);
      callback({
        error: 'Room Error',
        message: ["Room doesn't exist"],
      });
      return;
    }

    try {
      await this.msRooms.get(roomName)!.connectTransport(socket.id, params);
      callback(true);
    } catch (error: any) {
      callback({
        error: 'Connection Error',
        message: [error.message],
      });
    }
  }

  async onProduce(
    socket: Socket,
    params: ProduceParams,
    callback: (response: SocketException | string) => void
  ): Promise<void> {
    const roomName = socket.data.roomName;
    if (!this.msRooms.has(roomName)) {
      console.log(`--- [onConnectTransport] room ${roomName} doesnt exist ---`);
      callback({
        error: 'Room Error',
        message: ["Room doesn't exist"],
      });
      return;
    }

    const producerId = await this.msRooms
      .get(roomName)!
      .produce(socket.id, params);

    callback(producerId);

    this.msRooms
      .get(roomName)!
      .broadcastProducer(socket.id, producerId, params.appData.kind);
  }

  async onConsume(
    socket: Socket,
    params: ConsumeParams,
    callback: (response: SocketException | ConsumerParams) => void
  ): Promise<void> {
    const roomName = socket.data.roomName;
    if (!this.msRooms.has(roomName)) {
      console.log(`--- [onConsume] room ${roomName} doesnt exist ---`);
      callback({
        error: 'Room Error',
        message: ["Room doesn't exist"],
      });
      return;
    }

    try {
      const consumerParams = await this.msRooms
        .get(roomName)!
        .consume(socket.id, params);
      callback(consumerParams);
    } catch (error: any) {
      console.log('--- [onConsume] error ---', error);
      callback({
        error: 'Consume Error',
        message: [error.message],
      });
    }
  }

  onGetProducers(socket: Socket): void {
    const roomName = socket.data.roomName;
    if (!this.msRooms.has(roomName)) {
      console.log(`--- [onGetProducers] room ${roomName} doesnt exist ---`);
      return;
    }

    this.msRooms.get(roomName)!.sendProducers(socket.id);
  }

  onProducerPaused(socket: Socket, producerId: string, paused: boolean): void {
    const roomName = socket.data.roomName;
    if (!this.msRooms.has(roomName)) {
      console.log(`--- [onProducerPaused] room ${roomName} doesnt exist ---`);
      return;
    }

    this.msRooms.get(roomName)!.pauseProducer(socket.id, producerId, paused);
  }

  onProducerClosed(socket: Socket, kind: MediaStreamKind): void {
    const roomName = socket.data.roomName;
    if (!this.msRooms.has(roomName)) {
      console.log(`--- [onProducerPaused] room ${roomName} doesnt exist ---`);
      return;
    }

    this.msRooms.get(roomName)!.closeProducer(socket.id, kind);
  }

  onDisconnect(socket: Socket): void {
    const roomName = socket.data.roomName;
    if (!this.msRooms.has(roomName)) {
      console.log(`--- [Disconnect] room ${roomName} doesnt exist ---`);
      return;
    }

    this.msRooms.get(roomName)!.removePeer(socket.id);

    socket.leave(roomName);
    socket.data = {};

    if (!this.msRooms.get(roomName)!.getPeersNumber()) {
      this.msRooms.delete(roomName);
      this.broadcastRooms();
    }
  }

  initListeners() {
    this.server.on('connection', (socket) => {
      socket.on('start_session', () => {
        console.log(`--- Socket ${socket.id} connected to server ---`);

        this.broadcastRooms(socket);
      });

      socket.on('join', (payload, callback) => {
        this.joinRoom(socket, payload, callback);
      });

      // CLEAN MEDIASOUP COMUNICATION

      socket.on('create_webrtc_transport', ({}, callback) => {
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

      socket.on('get_producers', () => {
        this.onGetProducers(socket);
      });

      socket.on('producer_paused', (producerId, paused) => {
        this.onProducerPaused(socket, producerId, paused);
      });

      socket.on('producer_closed', (kind) => {
        this.onProducerClosed(socket, kind);
      });

      socket.on('exit_room', () => {
        this.onDisconnect(socket);
      });

      // ----------------------------

      socket.on('disconnect', () => {
        console.log(`--- Socket ${socket.id} disconnected from server ---`);

        this.onDisconnect(socket);
      });
    });
  }
}
