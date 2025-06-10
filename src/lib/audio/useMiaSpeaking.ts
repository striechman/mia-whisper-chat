
import { useState, useEffect } from 'react';

export function useMiaSpeaking(
  miaStream: MediaStream | null,
  onSpeaking: (isSpeaking: boolean) => void,
  threshold: number = 22  // סף עוצמה
) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    if (!miaStream) return;
    
    console.log('🎧 Setting up MIA voice detection...');
    
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(miaStream);
    const analyser = audioContext.createAnalyser();
    
    analyser.fftSize = 512;
    source.connect(analyser);

    let speaking = false;
    const data = new Uint8Array(analyser.frequencyBinCount);

    const detectSpeech = () => {
      analyser.getByteFrequencyData(data);
      const volume = data.reduce((a, b) => a + b, 0) / data.length;
      const nowSpeaking = volume > threshold;
      
      if (nowSpeaking !== speaking) {
        speaking = nowSpeaking;
        setIsSpeaking(speaking);
        onSpeaking(speaking);    // מיידע את ה-UI
        console.log(speaking ? '🗣️ MIA started speaking' : '🤐 MIA stopped speaking');
      }
      
      requestAnimationFrame(detectSpeech);
    };
    
    detectSpeech();

    return () => {
      console.log('🔇 Cleaning up MIA voice detection');
      audioContext.close();
    };
  }, [miaStream, onSpeaking, threshold]);

  return { isSpeaking };
}
