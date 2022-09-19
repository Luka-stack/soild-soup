import { useNavigate } from '@solidjs/router';
import { Icon } from 'solid-heroicons';
import { For, Match, Show, Switch } from 'solid-js';
import {
  computerDesktop,
  microphone,
  minus,
  phoneXMark,
  videoCamera,
} from 'solid-heroicons/solid';

import { SignalingAPI } from '../lib/mediasoup';

import {
  amIMuted,
  amIStreaming,
  isSharing,
  participants,
  screenStream,
} from '../state';

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
          <button
            class="bg-slate-700 text-white h-full flex justify-center items-center p-3 hover:bg-slate-600 relative"
            onClick={SignalingAPI.toggleStreaming}
          >
            <Icon path={videoCamera} class="w-8" />
            <Show when={amIStreaming() === false}>
              <Icon path={minus} class="absolute rotate-45 w-20" />
            </Show>
          </button>
          <button
            class="bg-slate-700 text-white h-full flex justify-center items-center p-3 hover:bg-slate-600 relative"
            onClick={SignalingAPI.shareScreen}
          >
            <Icon path={computerDesktop} class="w-8" />
            <Show when={!isSharing()}>
              <Icon path={minus} class="absolute rotate-45 w-20" />
            </Show>
          </button>
          <button
            class="bg-rose-700 text-white h-full flex justify-center items-center p-3 hover:bg-rose-600"
            onClick={exitRoom}
          >
            <Icon path={phoneXMark} class="w-8" />
          </button>
        </div>
      </div>

      <div class="flex flex-col space-y-5 h-full">
        <div
          class="flex w-full gap-2"
          classList={{
            'overflow-x-auto h-[20%]': screenStream() !== null,
            'flex-wrap h-full': screenStream() === null,
          }}
        >
          <For each={participants}>
            {(participant) => (
              <div
                class="p-3 text-slate-400 flex justify-center items-center relative grow shadow-2xl flex-col border border-black rounded-xl h-full"
                classList={{
                  'w-32': screenStream() !== null,
                  'min-w-[32%]': screenStream() === null,
                }}
              >
                <Switch>
                  <Match when={!participant.video}>
                    <>
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
                    </>
                  </Match>
                  <Match when={participant.video}>
                    <>
                      <video
                        autoplay
                        muted
                        ref={(el) => (el.srcObject = participant.video!)}
                        class="w-full h-full"
                      />
                      {/* <h3 class="absolute font-bold bg-black/50 rounded-md py-1 px-2 bottom-10 right-10"> */}
                      <h3 class="absolute font-bold bg-black/50 rounded-md py-1 px-2 bottom-2 right-2">
                        {participant.name}
                      </h3>
                    </>
                  </Match>
                </Switch>

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

        <Show when={screenStream()}>
          <div class="relative h-[75%] flex justify-center items-center mx-auto w-[99%]">
            <h3 class="absolute font-bold bg-black/50 rounded-md py-1 px-2 top-2 right-2 text-slate-400">
              {screenStream()!.name}
            </h3>
            <div class="h-full w-full">
              <video
                autoplay
                muted
                ref={(el) => (el.srcObject = screenStream()!.stream)}
                class="h-full w-full"
              />
            </div>
          </div>
        </Show>
      </div>
    </div>
  );
};
