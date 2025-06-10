
import { useState } from 'react';

export const useTabAudioCapture = () => {
  const [stream, setStream] = useState<MediaStream | null>(null);

  const startTabCapture = async () => {
    try {
      // Request both video and audio to get proper tab selection dialog
      const ms = await navigator.mediaDevices.getDisplayMedia({
        video: true,  // Need video to trigger tab selection
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      
      // Extract only the audio track
      const audioTracks = ms.getAudioTracks();
      if (audioTracks.length === 0) {
        throw new Error('No audio track available from selected tab');
      }
      
      // Create a new stream with only audio
      const audioOnlyStream = new MediaStream(audioTracks);
      setStream(audioOnlyStream);
      
      // Stop the video track since we don't need it
      ms.getVideoTracks().forEach(track => track.stop());
      
      return audioOnlyStream;
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
