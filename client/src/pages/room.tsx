import { useParams } from '@solidjs/router';
import { Icon } from 'solid-heroicons';
import { For, Show } from 'solid-js';
import {
  computerDesktop,
  microphone,
  minus,
  phoneXMark,
  videoCamera,
  xMark,
} from 'solid-heroicons/solid';

import { SignalingAPI } from '../lib/mediasoup';

import { amIMuted, participants } from '../state';

export const Room = () => {
  const params = useParams();

  return (
    <div class="bg-slate-900 h-screen">
      <div class="absolute border border-black bg-slate-700 rounded-md h-fit flex overflow-hidden bottom-20 left-1/2 -translate-x-1/2 shadow-lg z-50">
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
        <button class="bg-rose-700 text-white h-full flex justify-center items-center p-3 hover:bg-rose-600">
          <Icon path={phoneXMark} class="w-8" />
        </button>
      </div>

      <div class="grid grid-flow-col auto-cols-[minmax(0,_3fr)] auto-rows-[minmax(0,_3fr)] h-full">
        <For each={participants}>
          {(participant) => (
            <div class="p-4 border-2 border-black text-slate-400 flex justify-center items-center relative">
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
              {/* <p>{participant.muted ? 'Muted' : 'Not Muted'}</p> */}
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
