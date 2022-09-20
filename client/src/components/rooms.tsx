import { useNavigate } from '@solidjs/router';
import { batch, Component, createSignal, For, Match, Switch } from 'solid-js';

import { SignalingAPI } from '../lib/mediasoup';
import { rooms, setAuthRoom, username } from '../state';

export const Rooms: Component = () => {
  const navigate = useNavigate();

  const [selectedRoom, setSelectedRoom] = createSignal<string>('');
  const [createRoom, setCreateRoom] = createSignal(true);
  const [error, setError] = createSignal('');

  const changeTab = () => {
    batch(() => {
      setSelectedRoom('');
      setError('');
      setCreateRoom(!createRoom());
    });
  };

  const onConnect = async () => {
    if (username() && selectedRoom()) {
      const result = await SignalingAPI.joinRoom(
        username()!,
        selectedRoom(),
        createRoom()
      );

      if (result) {
        setError(result);
        return;
      }

      setAuthRoom(selectedRoom());
      navigate(`/rooms/${selectedRoom()}`);
    }
  };

  return (
    <div class="pb-4 w-72 flex flex-col items-center">
      <div class="flex w-full text-slate-400 text-center mb-2">
        <span
          class="w-1/2 py-1 rounded-t-xl border-b-2 border-slate-500 cursor-pointer hover:bg-slate-700/50"
          classList={{ 'bg-slate-700/50': !createRoom() }}
          onClick={changeTab}
        >
          Select Room
        </span>
        <span
          class="w-1/2 py-1 rounded-t-xl border-b-2 border-slate-500 cursor-pointer hover:bg-slate-700/50"
          classList={{ 'bg-slate-700/50': createRoom() }}
          onClick={changeTab}
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
            onInput={(e) => setSelectedRoom(e.currentTarget.value)}
          />
        </Match>
        <Match when={!createRoom()}>
          <h1 class="text-slate-300 text-xl mt-2">Rooms</h1>
          <div class="mt-2 text-slate-400 divide-y w-full divide-slate-700 text-center border-t border-b border-slate-700">
            <For
              each={rooms()}
              fallback={<div class="py-2">No open rooms yet</div>}
            >
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

      <p class="text-sm text-red-500 mt-1">{error()}</p>

      <button
        class="bg-blue-700 rounded-md py-1 text-slate-200 cursor-pointer hover:bg-blue-800 w-[80%] mt-5 disabled:bg-gray-700 disabled:cursor-not-allowed"
        disabled={selectedRoom() === null || selectedRoom()!.trim() === ''}
        onClick={onConnect}
      >
        {createRoom() ? 'Create Room' : 'Connect'}
      </button>
    </div>
  );
};
