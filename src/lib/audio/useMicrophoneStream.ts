
import { useState, useEffect } from 'react';

export function useMicrophoneStream() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isActive, setIsActive] = useState(false);

  const startMicrophone = async () => {
    try {
      console.log('Starting microphone...');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });
      
      setStream(mediaStream);
      setIsActive(true);
      console.log('Microphone started successfully');
      return mediaStream;
    } catch (error) {
      console.error('Error accessing microphone:', error);
      throw error;
    }
  };

  const stopMicrophone = () => {
    if (stream) {
      console.log('Stopping microphone...');
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsActive(false);
    }
  };

  useEffect(() => {
    return () => {
      stopMicrophone();
    };
  }, []);

  return {
    stream,
    isActive,
    startMicrophone,
    stopMicrophone,
  };
}
