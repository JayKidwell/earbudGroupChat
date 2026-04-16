Build a real-time group voice chat web app. Here's the full spec:

## What it does
- Users open the web app, enter a name and a room code, and join a voice group
- Everyone in the same room hears everyone else speak in real time (like a walkie-talkie that's always open)
- Audio routes through the user's connected earbuds/headphones automatically
- Rooms are ephemeral — they exist as long as someone is in them

## Tech stack
- **Backend**: Node.js with Express + Socket.io (signaling server)
- **Frontend**: React (Vite) using the browser WebRTC API
- **Audio**: getUserMedia() for mic capture, WebRTC peer connections for transport
- **STUN**: Use Google's public STUN server (stun:stun.google.com:19302) for now

## Project structure
/server
  index.js       — Express + Socket.io signaling server
/client
  src/
    App.jsx      — Main component with join screen + active room view
    useRoom.js   — Custom hook managing WebRTC peer connections
    useMic.js    — Custom hook for getUserMedia mic access
  index.html
  vite.config.js

## Signaling flow (implement this exactly)
1. Client connects via Socket.io and emits "join-room" with { roomId, userId }
2. Server tracks rooms as a Map of roomId → Set of socket IDs
3. Server sends new joiner the list of existing peers ("room-peers" event)
4. New joiner creates RTCPeerConnection for each existing peer, creates offer, sends via "signal" event
5. Existing peers receive offer, create answer, send back via "signal"
6. ICE candidates are relayed through server via "ice-candidate" event
7. On disconnect, server broadcasts "peer-left" to the room

## UI requirements
- Join screen: text input for display name + room code, big "Join Room" button
- Active room view: show room code prominently (so users can share it), list of connected members, a mute toggle button, leave button
- Show mic status (muted/active) clearly
- Keep styling clean and minimal — just make it functional

## Audio settings
- When creating peer connections, add only audio tracks (no video)
- Set audio constraints: { echoCancellation: true, noiseSuppression: true, sampleRate: 48000 }
- Each remote stream should be played through an <audio> element with autoplay
-- On mobile, attach remote streams to <audio> elements with playsinline and autoplay attributes, and trigger getUserMedia only inside a user gesture handler (button click), not on page load.

## Dev setup
- Server runs on port 3001
- Client Vite dev server proxies /socket.io to localhost:3001
- Include a README with: npm install steps, how to run both servers, how to test with two browser tabs

Start by creating the project structure and the signaling server first, then the React client.
```

---