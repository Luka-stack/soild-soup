import { Socket } from 'socket.io-client';

export function socketPromise(socket: Socket) {
  return function request(type: any, data = {}) {
    return new Promise<any>((resolve) => {
      socket.emit(type, data, resolve);
    });
  };
}
