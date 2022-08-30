import type { Socket } from 'socket.io-client';

import { ServerHandler } from './server-handler';

export namespace ServerAPI {
  let _serverHandler: ServerHandler | null;

  export function connect(socket: Socket) {
    _serverHandler = new ServerHandler(socket);
  }
}
