import { createSignal } from 'solid-js';
import { createStore } from 'solid-js/store';

export interface Participant {
  uuid: string;
  name: string;
  muted: boolean;
  audio: MediaStream;
  video: MediaStream | undefined;
  screen: MediaStream | undefined;
}

export interface PartialParticipant {
  uuid: string;
  name: string;
  audio?: MediaStream;
  video?: MediaStream;
  screen?: MediaStream;
}

export const updateParticipants = ({
  uuid,
  name,
  audio,
  video,
  screen,
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
        screen,
        muted: false,
      },
    ]);

    return;
  }

  const kind = video ? 'video' : 'screen';
  const stream = video ?? screen;

  setParticipants(
    (participant) => participant.uuid === uuid,
    kind,
    () => stream
  );
};

// These three should be combined
export const [amIMuted, setAmIMuted] = createSignal(false);
export const [amIStreaming, setAmIStreaming] = createSignal(false);
export const [username, setUsername] = createSignal<string | null>(null);
export const [authRoom, setAuthRoom] = createSignal<string | null>(null);

export const [isSharing, setIsSharing] = createSignal(false);

export const [rooms, setRooms] = createSignal<string[]>([]);

export const [participants, setParticipants] = createStore<Participant[]>([]);

export const [screen, setScreen] = createSignal<MediaStream | null>(null);
