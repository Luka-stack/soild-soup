import { createSignal } from 'solid-js';

export const [username, setUsername] = createSignal<string | null>(null);
export const [rooms, setRooms] = createSignal<string[]>([]);
export const [consumerAudio, setConsumerAudio] =
  createSignal<MediaStream | null>(null);
