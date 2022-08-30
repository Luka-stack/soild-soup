import { useParams } from '@solidjs/router';
import { createSignal, Show } from 'solid-js';
import { SignalingAPI } from '../lib/mediasoup';
import { consumerAudio } from '../state';

export const Room = () => {
  const params = useParams();
  const [localAudio, setLocalAudio] = createSignal<MediaStream | null>(null);

  const produceAudio = () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      console.log('Media Device is not available');
      return;
    }

    navigator.mediaDevices
      .getUserMedia({ audio: true, video: false })
      .then((stream) => {
        SignalingAPI.produceAudio(stream);
        setLocalAudio(stream);
      })
      .catch((error) => console.log('--- [Room]:produceAudio ', error, '---'));
  };

  return (
    <div>
      <h1>You're in {params.roomName}</h1>
      <button class="bg-blue-500" onClick={produceAudio}>
        Produce
      </button>

      <Show when={localAudio() !== null} fallback={<h1>No Consumer Audio</h1>}>
        <audio
          ref={(el) => (el.srcObject = localAudio())}
          controls
          autoplay
        ></audio>
      </Show>

      <Show
        when={consumerAudio() !== null}
        fallback={<h1>No Consumer Audio</h1>}
      >
        <audio
          controls
          autoplay
          ref={(el) => {
            console.log('Audio', consumerAudio());
            el.srcObject = consumerAudio();
            console.log(el.srcObject);
          }}
        />
      </Show>
    </div>
  );
};
