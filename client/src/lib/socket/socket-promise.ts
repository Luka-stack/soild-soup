import { Socket } from 'socket.io-client';

export function socketPromise(socket: Socket) {
  return function request(type: any, data = {}) {
    return new Promise<any>((resolve, reject) => {
      socket.emit(type, data, (response: any) => {
        if (response.error) {
          reject(response);
        } else {
          resolve(response);
        }
      });
    });
  };
}
