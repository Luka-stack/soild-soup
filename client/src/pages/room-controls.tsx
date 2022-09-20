import { useNavigate } from '@solidjs/router';
import { Component } from 'solid-js';
import { Icon } from 'solid-heroicons';
import { Show } from 'solid-js';
import {
  computerDesktop,
  microphone,
  minus,
  phoneXMark,
  videoCamera,
} from 'solid-heroicons/solid';

import { SignalingAPI } from '../lib/mediasoup';
import { screenStream, amIMuted, amIStreaming, amIScreening } from '../state';

export const RoomControls: Component = () => {
  const navigate = useNavigate();
  const exitRoom = () => {
    SignalingAPI.exitRoom();
    navigate('/', { replace: true });
  };

  const onShareScreen = () => {
    if (screenStream() !== null) {
      alert('Only one screen can be shared at a time');

      return;
    }

    SignalingAPI.shareScreen();
  };

  return (
    <div class="absolute h-28 w-full bottom-0 group z-40">
      <div class="absolute opacity-0 border border-black bg-slate-700 rounded-md h-fit flex overflow-hidden bottom-10 left-1/2 -translate-x-1/2 shadow-lg z-50 group-hover:opacity-100 transition-opacity ease-out duration-500">
        <button
          onClick={SignalingAPI.changeMutation}
          class="bg-slate-700 text-white h-full flex justify-center items-center p-3 hover:bg-slate-600 relative overflow-hidden"
        >
          <Icon path={microphone} class="w-8" />
          <Show when={amIMuted()}>
            <Icon path={minus} class="absolute opacity-80 rotate-45 w-20" />
          </Show>
        </button>
        <button
          class="bg-slate-700 text-white h-full flex justify-center items-center p-3 hover:bg-slate-600 relative  overflow-hidden"
          onClick={SignalingAPI.toggleStreaming}
        >
          <Icon path={videoCamera} class="w-8" />
          <Show when={amIStreaming() === false}>
            <Icon path={minus} class="absolute rotate-45 w-20" />
          </Show>
        </button>
        <button
          class="bg-slate-700 text-white h-full flex justify-center items-center p-3 hover:bg-slate-600 relative  overflow-hidden"
          onClick={onShareScreen}
        >
          <Icon path={computerDesktop} class="w-8" />
          <Show when={!amIScreening() && screenStream() === null}>
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
  );
};
