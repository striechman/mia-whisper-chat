import { useState, useEffect, useRef } from 'react';

export function useSmartMicrophone() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const dynamicThresholdRef = useRef<number>(0.01);
  const rmsHistoryRef = useRef<number[]>([]);

  const startMicrophone = async () => {
    try {
      console.log('Starting smart microphone...');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      });
      
      setStream(mediaStream);
      setIsActive(true);
      
      // Start dynamic threshold calculation
      startDynamicThresholdCalculation(mediaStream);
      
      console.log('Smart microphone started successfully');
      return mediaStream;
    } catch (error) {
      console.error('Error accessing microphone:', error);
      throw error;
    }
  };

  const startDynamicThresholdCalculation = (stream: MediaStream) => {
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    
    analyser.fftSize = 256;
    source.connect(analyser);
    
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    const calculateRMS = () => {
      analyser.getByteFrequencyData(dataArray);
      const rms = Math.sqrt(
        dataArray.reduce((sum, value) => sum + value * value, 0) / dataArray.length
      ) / 255;
      
      // Keep last 10 RMS values for dynamic threshold
      rmsHistoryRef.current.push(rms);
      if (rmsHistoryRef.current.length > 10) {
        rmsHistoryRef.current.shift();
      }
      
      // Calculate dynamic threshold as average + margin
      const avgRMS = rmsHistoryRef.current.reduce((sum, val) => sum + val, 0) / rmsHistoryRef.current.length;
      dynamicThresholdRef.current = Math.max(0.005, avgRMS + 0.01);
      
      requestAnimationFrame(calculateRMS);
    };
    
    calculateRMS();
  };

  const muteMicrophone = (shouldMute: boolean) => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !shouldMute;
        setIsMuted(shouldMute);
        console.log('Microphone', shouldMute ? 'muted' : 'unmuted');
      }
    }
  };

  const stopMicrophone = () => {
    if (stream) {
      console.log('Stopping smart microphone...');
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsActive(false);
      setIsMuted(false);
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
    isMuted,
    dynamicThreshold: dynamicThresholdRef.current,
    startMicrophone,
    stopMicrophone,
    muteMicrophone,
  };
}
