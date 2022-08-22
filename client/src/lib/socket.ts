import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';

let socket: Socket | null;

export const connectToServer = () => {
  if (socket) {
    console.warn('Already connected to server');
    return;
  }

  socket = io('http://localhost:5000');
  socket.connect();
  socket.emit('startSession');

  socket.onAny((event, ...args) => {
    console.group(`[Socket]:${event}`);
    console.log(`Args ${args}`);
    console.groupEnd();
  });
};
