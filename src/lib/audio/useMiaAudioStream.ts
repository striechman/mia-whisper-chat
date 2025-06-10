
import { useState, useEffect } from 'react';

export function useMiaAudioStream(audioElementId: string = 'miaAudio') {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

  useEffect(() => {
    const setupAudioCapture = async () => {
      const audioElement = document.getElementById(audioElementId) as HTMLAudioElement;
      if (!audioElement) {
        console.warn(`Audio element with id "${audioElementId}" not found`);
        return;
      }

      try {
        const ctx = new AudioContext();
        const source = ctx.createMediaElementSource(audioElement);
        const destination = ctx.createMediaStreamDestination();
        
        source.connect(destination);
        source.connect(ctx.destination); // Also play through speakers
        
        setAudioContext(ctx);
        setStream(destination.stream);
        console.log('MIA audio stream setup complete');
      } catch (error) {
        console.error('Error setting up MIA audio capture:', error);
      }
    };

    setupAudioCapture();

    return () => {
      if (audioContext) {
        audioContext.close();
      }
    };
  }, [audioElementId]);

  return { stream, audioContext };
}
