import { Component } from 'solid-js';
import { WebSocket } from '../lib/socket/socket';
import { setUsername } from '../state';

export const Login: Component = () => {
  let inputRef: HTMLInputElement | undefined;

  const onSubmitForm = (event: Event) => {
    event.preventDefault();

    if (!inputRef || !inputRef.value) {
      return;
    }

    setUsername(inputRef.value);
    WebSocket.connect();
  };

  return (
    <form
      onSubmit={onSubmitForm}
      class="flex flex-col p-4 w-72 h-40 items-center"
    >
      <label for="username" class="w-48 text-slate-400">
        Username
      </label>
      <input
        name="username"
        type="text"
        class="w-48 bg-slate-800 text-slate-300 border-b-2 border-slate-400 focus:outline-none mt-1"
        ref={inputRef}
      />
      <input
        type="submit"
        value="Connect"
        class="bg-blue-700 rounded-md w-48 py-1 mx-auto mt-5 text-slate-200 cursor-pointer hover:bg-blue-800"
      />
    </form>
  );
};
