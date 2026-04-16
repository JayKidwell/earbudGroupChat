require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

// Room management data structure
const rooms = new Map(); // roomId -> Set of socket IDs

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Handle room joining
  socket.on('join-room', ({ roomId, userId }) => {
    console.log(`User ${userId} joining room ${roomId}`);

    // Get existing peers in room with their user IDs
    const existingPeers = rooms.get(roomId) || new Set();
    console.log('[Server] existingPeers Set:', Array.from(existingPeers));

    const peersWithInfo = Array.from(existingPeers).map(socketId => {
      const peerSocket = io.sockets.sockets.get(socketId);
      const peerInfo = {
        socketId: socketId,
        userId: peerSocket ? peerSocket.userId : null
      };
      console.log('[Server] Created peer info:', peerInfo);
      return peerInfo;
    });

    console.log('[Server] Sending room-peers with:', peersWithInfo);
    // Send existing peers to new joiner
    socket.emit('room-peers', { peers: peersWithInfo });

    // Add new user to room
    socket.join(roomId);
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }
    rooms.get(roomId).add(socket.id);

    // Store user metadata on socket
    socket.userId = userId;
    socket.roomId = roomId;

    // Notify existing peers about new joiner
    socket.to(roomId).emit('peer-joined', {
      peerId: socket.id,
      userId: userId
    });

    console.log(`Room ${roomId} now has ${rooms.get(roomId).size} members`);
  });

  // Handle WebRTC signaling (offers and answers)
  socket.on('signal', ({ targetId, signal, type }) => {
    // Relay WebRTC signaling data to target peer
    io.to(targetId).emit('signal', {
      senderId: socket.id,
      signal: signal,
      type: type // 'offer' or 'answer'
    });

    console.log(`Relayed ${type} from ${socket.id} to ${targetId}`);
  });

  // Handle ICE candidates
  socket.on('ice-candidate', ({ targetId, candidate }) => {
    // Relay ICE candidate to target peer
    io.to(targetId).emit('ice-candidate', {
      senderId: socket.id,
      candidate: candidate
    });

    console.log(`Relayed ICE candidate from ${socket.id} to ${targetId}`);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);

    const roomId = socket.roomId;
    if (roomId && rooms.has(roomId)) {
      // Remove user from room
      rooms.get(roomId).delete(socket.id);

      // Notify remaining peers
      socket.to(roomId).emit('peer-left', { peerId: socket.id });

      // Clean up empty rooms
      if (rooms.get(roomId).size === 0) {
        rooms.delete(roomId);
        console.log(`Room ${roomId} deleted (empty)`);
      } else {
        console.log(`Room ${roomId} now has ${rooms.get(roomId).size} members`);
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
});
