import { Component, Match, Switch } from 'solid-js';
import { screenStream } from '../state';

import { Participant } from '../state';

interface Props {
  participant: Participant;
  roomSize: number;
}

export const ParticipantCard: Component<Props> = ({
  participant,
  roomSize,
}) => {
  return (
    <div
      class="p-1 text-slate-400 flex justify-center items-center relative shadow-2xl flex-col rounded-xl h-full border border-black/40"
      classList={{
        'order-first speaking-video': participant.speaking,
        'w-52': screenStream() !== null,
        'w-full': screenStream() === null && roomSize === 1,
        'w-[49%]': screenStream() === null && roomSize === 2,
        'w-[32%]': screenStream() === null && roomSize > 2,
      }}
    >
      <Switch>
        <Match when={!participant.video}>
          <>
            <div
              class="rounded-full w-28 h-28 flex justify-center items-center border-2 border-black cursor-default "
              classList={{
                'bg-indigo-800': !participant.muted,
                'bg-gray-800': participant.muted,
                speaking: participant.speaking,
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
          <div class="relative">
            <video
              autoplay
              muted
              ref={(el) => (el.srcObject = participant.video!)}
              class="w-full h-full"
            />
            <h3 class="absolute font-bold rounded-md py-1 px-2 -bottom-8 right-0 w-full text-center">
              {participant.name}
            </h3>
          </div>
        </Match>
      </Switch>

      <audio
        controls
        autoplay
        ref={(el) => (el.srcObject = participant.audio)}
        class="hidden"
      />
    </div>
  );
};
