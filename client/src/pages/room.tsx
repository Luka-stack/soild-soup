import { useNavigate } from '@solidjs/router';
import { Icon } from 'solid-heroicons';
import { For, Show } from 'solid-js';
import {
  computerDesktop,
  microphone,
  minus,
  phoneXMark,
  videoCamera,
} from 'solid-heroicons/solid';

import { SignalingAPI } from '../lib/mediasoup';

import { amIMuted, participants } from '../state';

export const Room = () => {
  const navigate = useNavigate();

  const exitRoom = () => {
    SignalingAPI.exitRoom();
    navigate('/', { replace: true });
  };

  return (
    <div class="bg-slate-900 h-screen">
      <div class="absolute h-28 w-full bottom-0 group z-40">
        <div class="absolute opacity-0 border border-black bg-slate-700 rounded-md h-fit flex overflow-hidden bottom-10 left-1/2 -translate-x-1/2 shadow-lg z-50 group-hover:opacity-100 transition-opacity ease-out duration-500">
          <button
            onClick={SignalingAPI.changeMutation}
            class="bg-slate-700 text-white h-full flex justify-center items-center p-3 hover:bg-slate-600 relative"
          >
            <Icon path={microphone} class="w-8" />
            <Show when={amIMuted()}>
              <Icon path={minus} class="absolute opacity-80 rotate-45 w-20" />
            </Show>
          </button>
          <button class="bg-slate-700 text-white h-full flex justify-center items-center p-3 hover:bg-slate-600 relative">
            <Icon path={videoCamera} class="w-8" />
            <Icon path={minus} class="absolute rotate-45 w-20" />
          </button>
          <button class="bg-slate-700 text-white h-full flex justify-center items-center p-3 hover:bg-slate-600 relative">
            <Icon path={computerDesktop} class="w-8" />
            <Icon path={minus} class="absolute rotate-45 w-20" />
          </button>
          <button
            class="bg-rose-700 text-white h-full flex justify-center items-center p-3 hover:bg-rose-600"
            onClick={exitRoom}
          >
            <Icon path={phoneXMark} class="w-8" />
          </button>
        </div>
      </div>

      <div class="flex w-full h-full flex-wrap gap-2">
        <For each={participants}>
          {(participant) => (
            <div class="p-4 text-slate-400 flex justify-center items-center relative min-w-[32%] grow shadow-2xl flex-col border border-black rounded-xl">
              <div
                class="rounded-full w-28 h-28 flex justify-center items-center border-2 border-black cursor-default"
                classList={{
                  'bg-indigo-800': !participant.muted,
                  'bg-gray-800': participant.muted,
                }}
              >
                <h1 class="font-bold text-4xl">
                  {participant.name.substring(0, 1)}
                </h1>
              </div>
              <h3 class="font-bold text-sm">{participant.name}</h3>
              <audio
                controls
                autoplay
                ref={(el) => (el.srcObject = participant.audio)}
                class="hidden"
              />
            </div>
          )}
        </For>
      </div>
    </div>
  );
};
