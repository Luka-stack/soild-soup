import { Socket } from 'socket.io-client';
import { setRooms } from '../../state';

export class ServerHandler {
  constructor(private readonly socket: Socket) {
    this.initListeners();
  }

  initListeners() {
    this.socket.on('rooms', (rooms: string[]) => {
      setRooms(rooms);
    });
  }
}
