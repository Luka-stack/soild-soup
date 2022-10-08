import { useNavigate } from '@solidjs/router';
import { createMemo, For, Show } from 'solid-js';

import { authRoom, participants, screenStream, username } from '../state';
import { ParticipantCard } from './participant-card';
import { RoomControls } from './room-controls';
import { ScreenCard } from './screen-card';

export const Room = () => {
  const navigate = useNavigate();

  const roomSize = createMemo(() => {
    return participants.length;
  });

  if (!username() || !authRoom()) {
    navigate('/', { replace: true });
  }

  return (
    <div class="bg-slate-900 h-screen">
      <RoomControls />

      <div class="flex flex-col space-y-5 h-full p-2">
        <div
          class="flex w-full gap-2 justify-center"
          classList={{
            'overflow-x-auto h-[20%] border-b border-black/50 pb-2':
              screenStream() !== null,
            'flex-wrap h-full': screenStream() === null,
          }}
        >
          <For each={participants}>
            {(participant) => (
              <ParticipantCard
                participant={participant}
                roomSize={roomSize()}
              />
            )}
          </For>
        </div>

        <Show when={screenStream()}>
          <ScreenCard
            name={screenStream()!.name}
            stream={screenStream()!.stream}
          />
        </Show>
      </div>
    </div>
  );
};
