/* @refresh reload */
import { render } from 'solid-js/web';

import './index.css';
import App from './App';
import { WebSocket } from './lib/socket/socket';
import { ServerHandler } from './lib/server';

WebSocket.createSocket();
let serverHandler;

if (WebSocket.socket()) {
  serverHandler = new ServerHandler(WebSocket.socket()!);
}

render(() => <App />, document.getElementById('root') as HTMLElement);
