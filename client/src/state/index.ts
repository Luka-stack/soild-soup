import { createSignal } from 'solid-js';
import { createMutable, createStore } from 'solid-js/store';

export interface Participant {
  uuid: string;
  name: string;
  audio: MediaStream;
  muted: boolean;
}

export const [username, setUsername] = createSignal<string | null>(null);
export const [rooms, setRooms] = createSignal<string[]>([]);
export const [consumerAudios, setConsumerAudios] = createSignal<MediaStream[]>(
  []
);

export const [participants, setParticipants] = createStore<Participant[]>([]);

// export const participantsState = createMutable({
//   participants: [] as Participant[],
//   addParticipant(participant: Participant) {
//     this.participants.push(participant);
//   },
// });
