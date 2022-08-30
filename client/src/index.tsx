/* @refresh reload */
import { render } from 'solid-js/web';

import './index.css';
import App from './App';
import { WebSocket } from './lib/socket/socket';
import { ServerAPI } from './lib/server';
import { SignalingAPI } from './lib/mediasoup';
import { Router } from '@solidjs/router';

WebSocket.createSocket();

if (WebSocket.socket()) {
  ServerAPI.connect(WebSocket.socket()!);
  SignalingAPI.connect(WebSocket.socket()!);
}

render(
  () => (
    <Router>
      <App />
    </Router>
  ),
  document.getElementById('root') as HTMLElement
);
