
import { useState } from 'react';

export const useSelfTabAudio = () => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  const capture = async (): Promise<MediaStream> => {
    try {
      // Request both video and audio to get proper tab selection dialog
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,  // Need video to trigger tab selection
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      
      // Extract only the audio track
      const audioTracks = mediaStream.getAudioTracks();
      if (audioTracks.length === 0) {
        throw new Error('No audio track available from selected tab');
      }
      
      // Create a new stream with only audio
      const audioOnlyStream = new MediaStream(audioTracks);
      setStream(audioOnlyStream);
      
      // Stop the video track since we don't need it
      mediaStream.getVideoTracks().forEach(track => track.stop());
      
      return audioOnlyStream;
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
