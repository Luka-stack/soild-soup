import { useNavigate } from '@solidjs/router';
import { Component, createSignal, For, Match, Switch } from 'solid-js';
import { SignalingAPI } from '../lib/mediasoup';
import { rooms, username } from '../state';

export const Rooms: Component = () => {
  const navigate = useNavigate();

  const [selectedRoom, setSelectedRoom] = createSignal<string | null>(null);
  const [createRoom, setCreateRoom] = createSignal(true);

  let inputRef: HTMLInputElement | undefined;

  const onConnect = () => {
    if (inputRef?.value && username()) {
      SignalingAPI.joinRoom(username()!, inputRef.value);

      navigate(`/rooms/${inputRef.value}`);
    }
  };

  return (
    <div class="pb-4 w-72 flex flex-col items-center">
      <div class="flex w-full text-slate-400 text-center mb-2">
        <span
          class="w-1/2 py-1 rounded-t-xl border-b-2 border-slate-500 cursor-pointer hover:bg-slate-700/50"
          classList={{ 'bg-slate-700/50': !createRoom() }}
          onClick={() => setCreateRoom(false)}
        >
          Select Room
        </span>
        <span
          class="w-1/2 py-1 rounded-t-xl border-b-2 border-slate-500 cursor-pointer hover:bg-slate-700/50"
          classList={{ 'bg-slate-700/50': createRoom() }}
          onClick={() => setCreateRoom(true)}
        >
          Create Room
        </span>
      </div>

      <Switch>
        <Match when={createRoom()}>
          <label for="roomname" class="w-48 text-slate-400 mt-4">
            Room name
          </label>
          <input
            name="roomname"
            type="text"
            class="w-48 bg-slate-800 text-slate-300 border-b-2 border-slate-400 focus:outline-none mt-1"
            ref={inputRef}
          />
        </Match>
        <Match when={!createRoom()}>
          <h1 class="text-slate-300 text-xl mt-2">Rooms</h1>
          <div class="mt-2 text-slate-400 divide-y w-full divide-slate-700 text-center border-t border-b border-slate-700">
            <For each={rooms()}>
              {(room) => (
                <p
                  class="py-2 hover:bg-slate-700/50 cursor-pointer"
                  classList={{ 'bg-slate-700/50': selectedRoom() === room }}
                  onClick={() => setSelectedRoom(room)}
                >
                  {room}
                </p>
              )}
            </For>
          </div>
        </Match>
      </Switch>

      <button
        class="bg-blue-700 rounded-md py-1 text-slate-200 cursor-pointer hover:bg-blue-800 w-[80%] mt-5"
        onClick={onConnect}
      >
        Connect
      </button>
    </div>
  );
};
