import { Component, onMount, Show } from 'solid-js';

import { WebSocket } from '../lib/socket/socket';
import { SignalingAPI } from '../lib/mediasoup';
import { Login } from '../components/login';
import { Rooms } from '../components/rooms';
import { username } from '../state';

export const Authentication: Component = () => {
  onMount(() => {
    if (WebSocket.socket()) {
      SignalingAPI.connect(WebSocket.socket()!);
    }
  });

  return (
    <div class="h-screen bg-slate-900 flex justify-center items-center">
      <div class="bg-slate-800 rounded-xl flex justify-center items-center">
        <Show when={username() !== null} fallback={<Login />}>
          <Rooms />
        </Show>
      </div>
    </div>
  );
};
