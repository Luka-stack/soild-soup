import { io } from 'socket.io-client';
import { Socket } from 'socket.io-client';

export namespace WebSocket {
  let _socket: Socket | null;

  export function createSocket() {
    if (!_socket) {
      _socket = io('http://localhost:5000', { autoConnect: false });

      _socket.onAny((event, ...args) => {
        console.group(`[Socket]:${event}`);
        console.log(`Args ${args}`);
        console.groupEnd();
      });

      _socket.once('connect', () => {
        _socket?.emit('start_session');
      });

      _socket.on('disconnect', () => console.log('Socket disconnected'));
    }
  }

  export function connect() {
    if (!_socket) {
      throw 'No socket available';
    }

    if (_socket.connected) {
      return;
    }

    _socket.connect();
  }

  export function isConnected(): boolean {
    if (!_socket || !_socket.connected) {
      return false;
    }

    return true;
  }

  export function socket(): Socket | null {
    return _socket;
  }
}
