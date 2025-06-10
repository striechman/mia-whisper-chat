
import { useState, useEffect, useRef } from 'react';

export function useVAD(
  stream: MediaStream | null,
  onSpeakingStart: () => void,
  onSpeakingStop: () => void,
  threshold: number = 0.01
) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!stream) return;

    const setupVAD = async () => {
      try {
        const audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);
        
        analyser.fftSize = 256;
        source.connect(analyser);
        
        audioContextRef.current = audioContext;
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        
        const checkAudioLevel = () => {
          if (!analyserRef.current) return;
          
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
          const normalizedLevel = average / 255;
          
          if (normalizedLevel > threshold) {
            if (!isSpeaking) {
              console.log('Speech detected, level:', normalizedLevel);
              setIsSpeaking(true);
              onSpeakingStart();
            }
            
            // Reset timeout
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
            }
            
            timeoutRef.current = setTimeout(() => {
              console.log('Speech stopped');
              setIsSpeaking(false);
              onSpeakingStop();
            }, 1000); // Stop after 1 second of silence
          }
          
          requestAnimationFrame(checkAudioLevel);
        };
        
        checkAudioLevel();
      } catch (error) {
        console.error('Error setting up VAD:', error);
      }
    };

    setupVAD();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stream, threshold, isSpeaking, onSpeakingStart, onSpeakingStop]);

  return { isSpeaking };
}
