import { useParams } from '@solidjs/router';
import { For } from 'solid-js';
import { SignalingAPI } from '../lib/mediasoup';

import { participants } from '../state';

export const Room = () => {
  const params = useParams();

  return (
    <div>
      <h1>You're in {params.roomName}</h1>

      <button
        onClick={() => SignalingAPI.pauseProducer('audio')}
        class="bg-rose-500 text-white px-2 py-1 rounded-full"
      >
        Mute
      </button>

      <For each={participants}>
        {(participant) => (
          <div class="p-4 border-2 border-black">
            <h1>{participant.name}</h1>
            <p>{participant.muted ? 'Muted' : 'Not Muted'}</p>
            <audio
              controls
              autoplay
              ref={(el) => (el.srcObject = participant.audio)}
            />
          </div>
        )}
      </For>
    </div>
  );
};
