import { useState, useEffect, useRef } from 'react';
import { useMic } from './useMic';
import { useRoom } from './useRoom';
import './App.css';

function App() {
  // User state
  const [userName, setUserName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isInRoom, setIsInRoom] = useState(false);

  // Generate unique user ID
  const [userId] = useState(() => `user-${Math.random().toString(36).substr(2, 9)}`);

  // Mic and room hooks
  const { stream, isMuted, error, startMic, toggleMute, stopMic } = useMic();
  const { peers, isConnected, leaveRoom } = useRoom(
    isInRoom ? roomCode : null,
    userId,
    stream
  );

  const handleJoinRoom = async (e) => {
    e.preventDefault();

    if (!userName.trim() || !roomCode.trim()) {
      alert('Please enter both name and room code');
      return;
    }

    console.log('[App] Starting microphone...');
    // Start microphone (user gesture requirement for mobile)
    const micStream = await startMic();
    console.log('[App] Microphone started:', !!micStream, 'Current stream state:', !!stream);
    if (micStream) {
      console.log('[App] Setting isInRoom=true');
      setIsInRoom(true);
    } else {
      alert('Failed to access microphone. Please check permissions.');
    }
  };

  const handleLeaveRoom = () => {
    leaveRoom();
    stopMic();
    setIsInRoom(false);
  };

  return (
    <div className="app">
      {!isInRoom ? (
        <JoinScreen
          userName={userName}
          setUserName={setUserName}
          roomCode={roomCode}
          setRoomCode={setRoomCode}
          onJoin={handleJoinRoom}
        />
      ) : (
        <RoomView
          roomCode={roomCode}
          userName={userName}
          peers={peers}
          isMuted={isMuted}
          isConnected={isConnected}
          onToggleMute={toggleMute}
          onLeave={handleLeaveRoom}
          micError={error}
        />
      )}
    </div>
  );
}

function JoinScreen({ userName, setUserName, roomCode, setRoomCode, onJoin }) {
  return (
    <div className="join-screen">
      <h1>Earbud Group Chat</h1>
      <form onSubmit={onJoin}>
        <div className="form-group">
          <label htmlFor="userName">Display Name</label>
          <input
            type="text"
            id="userName"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Enter your name"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="roomCode">Room Code</label>
          <input
            type="text"
            id="roomCode"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
            placeholder="Enter room code"
            required
          />
        </div>

        <button type="submit" className="join-button">
          Join Room
        </button>
      </form>
    </div>
  );
}

function RoomView({ roomCode, userName, peers, isMuted, isConnected, onToggleMute, onLeave, micError }) {
  return (
    <div className="room-view">
      <div className="room-header">
        <h2>Room: {roomCode}</h2>
        <p className="share-code">Share this code with others to join</p>
        {!isConnected && <p className="status-warning">Connecting...</p>}
      </div>

      <div className="members-section">
        <h3>Connected Members ({peers.length + 1})</h3>
        <div className="members-list">
          <div className="member self">
            {userName} (you) {isMuted ? '🔇' : '🎤'}
          </div>
          {peers.map((peer, index) => (
            <RemotePeer key={peer.peerId || index} peer={peer} />
          ))}
        </div>
      </div>

      {micError && (
        <div className="error-message">
          Microphone error: {micError}
        </div>
      )}

      <div className="controls">
        <button
          onClick={onToggleMute}
          className={`control-button ${isMuted ? 'muted' : 'active'}`}
        >
          {isMuted ? 'Unmute' : 'Mute'}
        </button>

        <button onClick={onLeave} className="control-button leave">
          Leave Room
        </button>
      </div>
    </div>
  );
}

function RemotePeer({ peer }) {
  const audioRef = useRef(null);

  useEffect(() => {
    if (audioRef.current && peer.stream) {
      audioRef.current.srcObject = peer.stream;
    }
  }, [peer.stream]);

  return (
    <div className="member">
      {peer.userId || 'Connecting...'}
      <audio
        ref={audioRef}
        autoPlay
        playsInline
      />
    </div>
  );
}

export default App;
