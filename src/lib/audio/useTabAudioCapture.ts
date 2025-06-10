
import { useState } from 'react';

export const useTabAudioCapture = () => {
  const [stream, setStream] = useState<MediaStream | null>(null);

  const startTabCapture = async () => {
    try {
      // Chrome/Edge נותנים אפשרות לבחור "Chrome Tab"
      const ms = await navigator.mediaDevices.getDisplayMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false
        },
        video: false          // אין צורך בוידאו
      });
      setStream(ms);
      return ms;
    } catch (error) {
      console.error('Error starting tab capture:', error);
      throw error;
    }
  };

  const stopTabCapture = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  return { stream, startTabCapture, stopTabCapture };
};
