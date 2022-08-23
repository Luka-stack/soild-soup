import { createSignal } from 'solid-js';

export const [username, setUsername] = createSignal<string | null>(null);
export const [rooms, setRooms] = createSignal<string[]>([]);
export const [selectedRoom, setSelectedRoom] = createSignal<string | null>(
  null
);
