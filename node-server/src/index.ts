import express from 'express';
import http from 'http';
import { MsServer } from './ms-server';

// TODO export
const SERVER_PORT = 5000;

const app = express();
const httpServer = http.createServer(app);

const msServer = new MsServer(httpServer);

httpServer.listen(SERVER_PORT, () => {
  console.log(`--- Server listening on port ${SERVER_PORT} ---`);
});
