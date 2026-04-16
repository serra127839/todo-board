/**
 * local server entry file, for local development
 */
import app from './app.js';
import http from 'http';
import { WebSocketServer } from 'ws';
import { onEvent } from './realtime/hub.js';
import { getBoard } from './repositories/boardRepo.js';
import { listTasks } from './repositories/tasksRepo.js';
import { listCells } from './repositories/cellsRepo.js';
import { verifyToken } from './auth/simpleToken.js';

/**
 * start server with port
 */
const PORT = process.env.PORT || 3001;

const server = http.createServer(app);

const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', async (socket, req) => {
  const url = req.url || '';
  const query = url.includes('?') ? url.slice(url.indexOf('?') + 1) : '';
  const token = new URLSearchParams(query).get('token') || '';

  if (!verifyToken(token)) {
    socket.close(1008);
    return;
  }

  try {
    const [board, tasks, cells] = await Promise.all([
      getBoard('default-board'),
      listTasks('default-board'),
      listCells('default-board'),
    ]);

    socket.send(
      JSON.stringify({
        type: 'server:hello',
        payload: { board, tasks, cells },
      }),
    );
  } catch {
    socket.close();
    return;
  }

  const off = onEvent((event) => {
    if (socket.readyState !== socket.OPEN) return;
    socket.send(JSON.stringify(event));
  });

  socket.on('close', () => {
    off();
  });
});

server.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`);
});

/**
 * close server
 */
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;
