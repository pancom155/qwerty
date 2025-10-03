const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // palitan kung gusto mong limitahan
    methods: ["GET", "POST"]
  }
});

// Example socket.io
io.on('connection', (socket) => {
  console.log('🟢 New client connected:', socket.id);

  socket.on('message', (msg) => {
    console.log('Message:', msg);
    io.emit('message', msg); // broadcast sa lahat
  });

  socket.on('disconnect', () => {
    console.log('🔴 Client disconnected:', socket.id);
  });
});

// Run server (hindi pwede sa Vercel, kaya separate host)
const PORT = process.env.SOCKET_PORT || 4000;
server.listen(PORT, () => {
  console.log(`Socket.io server running at http://localhost:${PORT}`);
});
