import { Component, Show } from 'solid-js';
import { Login } from '../components/login';
import { Rooms } from '../components/rooms';
import { username } from '../state';

export const Authentication: Component = () => {
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
