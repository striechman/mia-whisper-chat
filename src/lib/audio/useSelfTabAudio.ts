
import { useState } from 'react';

export const useSelfTabAudio = () => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  const capture = async (): Promise<MediaStream> => {
    try {
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        audio: true,
        video: false
      });
      setStream(mediaStream);
      return mediaStream;
    } catch (error) {
      console.error('Error capturing tab audio:', error);
      throw error;
    }
  };

  const stopCapture = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  return { stream, capture, stopCapture };
};
