import { useState } from 'react';

export const useSelfTabAudio = () => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  const capture = async (): Promise<MediaStream> => {
    try {
      console.log('Requesting display media with audio...');
      
      // Check if getDisplayMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        throw new Error('getDisplayMedia is not supported in this browser');
      }
      
      // Request display media with audio - this will show browser's tab selection dialog
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,  // We need to request video to get the tab selection, but we'll use only audio
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      
      console.log('Display media stream obtained:', mediaStream);
      
      // Extract the audio track
      const audioTracks = mediaStream.getAudioTracks();
      console.log('Audio tracks found:', audioTracks.length);
      
      if (audioTracks.length === 0) {
        // Stop video track since we don't need it
        mediaStream.getVideoTracks().forEach(track => track.stop());
        throw new Error('No audio track available from selected tab. Make sure to select a tab that has audio and check "Share audio" checkbox.');
      }
      
      // Create a new stream with only audio (but keep video track active to maintain the stream)
      const audioOnlyStream = new MediaStream(audioTracks);
      
      // Stop video tracks after a short delay to ensure audio keeps working
      setTimeout(() => {
        mediaStream.getVideoTracks().forEach(track => track.stop());
      }, 1000);
      
      setStream(audioOnlyStream);
      console.log('Audio stream set successfully');
      
      return audioOnlyStream;
    } catch (error) {
      console.error('Error capturing tab audio:', error);
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          throw new Error('Permission denied. Please allow screen sharing and make sure to select "Share audio" checkbox.');
        } else if (error.name === 'NotSupportedError') {
          throw new Error('Screen sharing with audio is not supported in this browser. Try using Chrome or Edge.');
        } else if (error.name === 'NotFoundError') {
          throw new Error('No suitable audio source found. Make sure the selected tab has audio playing.');
        } else if (error.name === 'AbortError') {
          throw new Error('Screen sharing was cancelled. Please try again and select a tab with "Share audio" enabled.');
        }
      }
      
      throw error;
    }
  };

  const stopCapture = () => {
    if (stream) {
      console.log('Stopping audio capture...');
      stream.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped track:', track.kind);
      });
      setStream(null);
    }
  };

  return { stream, capture, stopCapture };
};
