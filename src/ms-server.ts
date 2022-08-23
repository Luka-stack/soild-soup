import { Server, Socket } from 'socket.io';
import type { Server as HttpServer } from 'http';
import { MsRoom } from './ms-room';
import { MsPeer } from './ms-peer';
import { RtpCapabilities } from 'mediasoup/node/lib/RtpParameters';

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
  }

  getRouterCapabilities(
    socket: Socket,
    callback: (params: RtpCapabilities) => any
  ): void {
    const room = this._msRooms.get(socket.data.roomName);

    if (!room) {
      // TODO room on found
      console.log(`--- Room ${socket.data.roomName} not found ---`);
      return;
    }

    const params = room.getRouterCapabilities();
    callback(params);
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

      socket.on('get_router_capabilitites', (callback) => {
        this.getRouterCapabilities(socket, callback);
      });

      socket.on('disconnect', () => {
        console.log(`--- Socket ${socket.id} disconnected from server`);
      });
    });
  }
}
