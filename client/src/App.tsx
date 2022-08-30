import { Route, Routes } from '@solidjs/router';
import { Component } from 'solid-js';
import { Authentication } from './pages/authentication';
import { Room } from './pages/room';

const App: Component = () => {
  return (
    <Routes>
      <Route path="/" component={Authentication} />
      <Route path="/rooms/:roomName" component={Room} />
    </Routes>
  );
};

export default App;
