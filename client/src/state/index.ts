import { createSignal } from 'solid-js';
import { createMutable, createStore } from 'solid-js/store';

export interface Participant {
  uuid: string;
  name: string;
  audio: MediaStream;
  muted: boolean;
}

// These three should be combined
export const [amIMuted, setAmIMuted] = createSignal<boolean>(false);
export const [username, setUsername] = createSignal<string | null>(null);
export const [authRoom, setAuthRoom] = createSignal<string | null>(null);

export const [rooms, setRooms] = createSignal<string[]>([]);

export const [participants, setParticipants] = createStore<Participant[]>([]);
