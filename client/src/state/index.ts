import { createSignal } from 'solid-js';
import { createStore } from 'solid-js/store';

export interface Participant {
  uuid: string;
  name: string;
  muted: boolean;
  audio: MediaStream;
  video: MediaStream | undefined;
}

export interface PartialParticipant {
  uuid: string;
  name: string;
  audio?: MediaStream;
  video?: MediaStream;
}

export interface ScreenStream {
  uuid: string;
  name: string;
  stream: MediaStream;
}

export const updateParticipants = ({
  uuid,
  name,
  audio,
  video,
}: PartialParticipant): void => {
  const found = participants.some((p) => p.uuid === uuid);

  if (!found) {
    setParticipants([
      ...participants,
      {
        uuid,
        name,
        audio: audio!,
        video,
        muted: false,
      },
    ]);

    return;
  }

  setParticipants(
    (participant) => participant.uuid === uuid,
    'video',
    () => video
  );
};

// These three should be combined
export const [amIMuted, setAmIMuted] = createSignal(false);
export const [amIStreaming, setAmIStreaming] = createSignal(false);
export const [amIScreening, setAmIScreening] = createSignal(false);
export const [username, setUsername] = createSignal<string | null>(null);
export const [authRoom, setAuthRoom] = createSignal<string | null>(null);

export const [rooms, setRooms] = createSignal<string[]>([]);

export const [participants, setParticipants] = createStore<Participant[]>([]);

export const [screenStream, setScreenStream] =
  createSignal<ScreenStream | null>(null);
