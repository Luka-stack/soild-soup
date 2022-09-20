import { Component } from 'solid-js';

interface Props {
  name: string;
  stream: MediaStream;
}

export const ScreenCard: Component<Props> = ({ name, stream }) => {
  return (
    <div class="relative h-[75%] flex justify-center items-center mx-auto w-[99%]">
      <h3 class="absolute font-bold bg-black/50 rounded-md py-1 px-2 top-2 right-2 text-slate-400">
        {name}
      </h3>
      <div class="h-full w-full">
        <video
          autoplay
          muted
          ref={(el) => (el.srcObject = stream)}
          class="h-full w-full"
        />
      </div>
    </div>
  );
};
