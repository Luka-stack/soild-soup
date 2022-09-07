import { SignalingHandler } from './signaling-handler';

import type { Socket } from 'socket.io-client';

export namespace SignalingAPI {
  let _signalingHandler: SignalingHandler | null;

  export function connect(socket: Socket) {
    if (_signalingHandler) {
      return;
    }

    _signalingHandler = new SignalingHandler(socket);
  }

  export function joinRoom(username: string, roomName: string): void {
    if (!_signalingHandler) {
      return;
    }

    _signalingHandler.join(username, roomName);
  }

  export function changeMutation() {
    if (!_signalingHandler) {
      return;
    }

    _signalingHandler.changeMutation();
  }

  export function exitRoom() {
    if (!_signalingHandler) {
      return;
    }

    _signalingHandler.disconnect();
    _signalingHandler = null;
  }

  // export function produceAudio(stream: MediaStream): void {
  //   if (!_signalingHandler) {
  //     return;
  //   }

  //   _signalingHandler.produce('audio', stream);
  // }
}
