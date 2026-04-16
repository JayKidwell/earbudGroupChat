import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

// ICE servers configuration (STUN for NAT traversal, TURN for relay fallback)
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.google.com:19302' },
    // TURN server (optional but recommended for production/mobile)
    ...(import.meta.env.VITE_TURN_URL ? [{
      urls: import.meta.env.VITE_TURN_URL,
      username: import.meta.env.VITE_TURN_USERNAME,
      credential: import.meta.env.VITE_TURN_PASSWORD
    }] : [])
  ]
};

export function useRoom(roomId, userId, localStream) {
  const [peers, setPeers] = useState(new Map()); // peerId -> { connection, stream, userId }
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);
  const peersRef = useRef(new Map());

  // Helper function to create peer connection
  const createPeerConnection = (peerId, isInitiator = false) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add local audio track
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }

    // Handle incoming remote stream
    pc.ontrack = (event) => {
      console.log('Received remote track from', peerId);
      const remoteStream = event.streams[0];

      peersRef.current.set(peerId, {
        ...peersRef.current.get(peerId),
        stream: remoteStream
      });
      setPeers(new Map(peersRef.current));
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('Sending ICE candidate to', peerId);
        socketRef.current.emit('ice-candidate', {
          targetId: peerId,
          candidate: event.candidate
        });
      }
    };

    // Monitor connection state
    pc.onconnectionstatechange = () => {
      console.log(`Peer ${peerId} connection state: ${pc.connectionState}`);
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        // Could implement reconnection logic here
      }
    };

    return pc;
  };

  // Initialize socket connection
  useEffect(() => {
    if (!roomId || !userId) {
      console.log('[useRoom] Skipping socket creation - roomId or userId missing', { roomId, userId });
      return;
    }

    console.log('[useRoom] Creating socket for room:', roomId, 'user:', userId, 'stream:', localStream ? 'available' : 'null');

    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5173';
    console.log('[useRoom] Connecting to socket:', socketUrl);

    const socket = io(socketUrl, {
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('[useRoom] Socket connected:', socket.id);
      setIsConnected(true);
    });

    socket.on('disconnect', (reason) => {
      console.log('[useRoom] Socket disconnected. Reason:', reason);
      setIsConnected(false);
    });

    // Handle existing peers when joining room
    socket.on('room-peers', async ({ peers }) => {
      console.log('Existing peers in room:', peers);

      // Create offer for each existing peer
      for (const peer of peers) {
        console.log('[useRoom] Processing peer:', peer);
        const { socketId, userId: peerUserId } = peer;
        console.log('[useRoom] Extracted socketId:', socketId, 'userId:', peerUserId);
        const pc = createPeerConnection(socketId, true);

        peersRef.current.set(socketId, {
          connection: pc,
          stream: null,
          userId: peerUserId
        });

        try {
          // Create and send offer
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          socket.emit('signal', {
            targetId: socketId,
            signal: offer,
            type: 'offer'
          });

          console.log('Sent offer to', socketId);
        } catch (err) {
          console.error('Error creating offer:', err);
        }
      }

      setPeers(new Map(peersRef.current));
    });

    // Handle new peer joining
    socket.on('peer-joined', ({ peerId, userId: peerUserId }) => {
      console.log('New peer joined:', peerId, peerUserId);

      // Don't create connection yet - wait for their offer
      peersRef.current.set(peerId, {
        connection: null,
        stream: null,
        userId: peerUserId
      });
      setPeers(new Map(peersRef.current));
    });

    // Handle incoming WebRTC signals (offers and answers)
    socket.on('signal', async ({ senderId, signal, type }) => {
      console.log(`Received ${type} from ${senderId}`);

      let peerData = peersRef.current.get(senderId);

      if (type === 'offer') {
        // Create peer connection if it doesn't exist
        if (!peerData || !peerData.connection) {
          const pc = createPeerConnection(senderId, false);
          peerData = {
            connection: pc,
            stream: null,
            userId: peerData?.userId || null
          };
          peersRef.current.set(senderId, peerData);
        }

        try {
          // Set remote description and create answer
          await peerData.connection.setRemoteDescription(new RTCSessionDescription(signal));
          const answer = await peerData.connection.createAnswer();
          await peerData.connection.setLocalDescription(answer);

          socket.emit('signal', {
            targetId: senderId,
            signal: answer,
            type: 'answer'
          });

          console.log('Sent answer to', senderId);
        } catch (err) {
          console.error('Error handling offer:', err);
        }
      } else if (type === 'answer') {
        // Set remote description
        try {
          await peerData.connection.setRemoteDescription(new RTCSessionDescription(signal));
          console.log('Set remote description from', senderId);
        } catch (err) {
          console.error('Error handling answer:', err);
        }
      }

      setPeers(new Map(peersRef.current));
    });

    // Handle ICE candidates
    socket.on('ice-candidate', async ({ senderId, candidate }) => {
      console.log('Received ICE candidate from', senderId);

      const peerData = peersRef.current.get(senderId);
      if (peerData && peerData.connection) {
        try {
          await peerData.connection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('Error adding ICE candidate:', err);
        }
      }
    });

    // Handle peer leaving
    socket.on('peer-left', ({ peerId }) => {
      console.log('Peer left:', peerId);

      const peerData = peersRef.current.get(peerId);
      if (peerData && peerData.connection) {
        peerData.connection.close();
      }

      peersRef.current.delete(peerId);
      setPeers(new Map(peersRef.current));
    });

    socketRef.current = socket;

    return () => {
      console.log('[useRoom] Cleanup running - disconnecting socket:', socket.id);
      // Close all peer connections for this socket
      peersRef.current.forEach(({ connection }) => {
        if (connection) {
          connection.close();
        }
      });
      peersRef.current.clear();
      setPeers(new Map());

      // Disconnect this specific socket instance
      socket.disconnect();
      console.log('[useRoom] Cleanup complete');
    };
  }, [roomId, userId]);

  // Join room when socket connects and localStream available
  useEffect(() => {
    console.log('[useRoom] Join effect running', {
      hasSocket: !!socketRef.current,
      isConnected,
      hasStream: !!localStream,
      roomId,
      userId
    });

    if (!socketRef.current || !isConnected || !localStream) {
      console.log('[useRoom] Not ready to join yet - waiting...');
      return;
    }

    console.log('[useRoom] Emitting join-room');
    socketRef.current.emit('join-room', { roomId, userId });
  }, [isConnected, roomId, userId, localStream]);

  const leaveRoom = () => {
    // Close all peer connections
    peersRef.current.forEach(({ connection }) => {
      if (connection) {
        connection.close();
      }
    });

    peersRef.current.clear();
    setPeers(new Map());

    // Disconnect socket
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  };

  return {
    peers: Array.from(peers.values()),
    isConnected,
    leaveRoom
  };
}
