const app = require('./app');
import { createServer } from 'http';
import { Server } from 'socket.io';
const { addUser, removeUser, getUser } = require('../utiles/socket');

const port = process.env.PORT || 4000;

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    // Which domain is able to access the websocket
    origin: 'http://127.0.0.1:5500',
  },
});

io.on('connection', (socket) => {
  console.log('A user is connected');

  socket.on('addUser', (userId) => {
    const newUsers = addUser(userId, socket.id);
    // we send all the online users to the user incase we wanna know which user is online
    io.emit('getUsers', newUsers);
  });

  socket.on('sendMessage', ({ senderId, recieverId, text }) => {
    const user: any = getUser(recieverId);

    if (!user) {
      return;
    }

    io.to(user.socketId).emit('getMessage', {
      senderId,
      text,
    });
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
    const newUsers = removeUser(socket.id);
    // we send all the online users to the user incase we wanna know which user is online
    io.emit('getUsers', newUsers);
  });
});

httpServer.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
