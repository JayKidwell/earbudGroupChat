import { useState, useEffect, useRef } from 'react';

export function useMic() {
  const [stream, setStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState(null);
  const streamRef = useRef(null);

  const startMic = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
          sampleRate: 48000
        }
      });

      streamRef.current = mediaStream;
      setStream(mediaStream);
      setError(null);
      return mediaStream;
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError(err.message);
      return null;
    }
  };

  const toggleMute = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const stopMic = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setStream(null);
      setIsMuted(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMic();
    };
  }, []);

  return {
    stream,
    isMuted,
    error,
    startMic,
    toggleMute,
    stopMic
  };
}
