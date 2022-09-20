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

  export async function joinRoom(
    username: string,
    roomName: string,
    createRoom: boolean
  ): Promise<string | null> {
    if (!_signalingHandler) {
      return 'Not connected to server';
    }

    return await _signalingHandler.join(username, roomName, createRoom);
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

  export function toggleStreaming() {
    if (!_signalingHandler) {
      return;
    }

    _signalingHandler.toggleStreaming();
  }

  export function shareScreen() {
    if (!_signalingHandler) {
      return;
    }

    _signalingHandler.shareScreen();
  }

  export function hasProducer(kind: string): boolean {
    if (!_signalingHandler) {
      return false;
    }

    return _signalingHandler.hasProducer(kind);
  }
}
