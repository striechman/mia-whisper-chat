
import { useState, useEffect } from 'react';
import { useVAD } from './useVAD';

export function useSmartMiaSpeaking(
  miaStream: MediaStream | null,
  onMuteMicrophone?: (shouldMute: boolean) => void
) {
  const [isMiaSpeaking, setIsMiaSpeaking] = useState(false);

  const { isSpeaking } = useVAD(
    miaStream,
    () => {
      console.log('MIA started speaking - muting microphone');
      setIsMiaSpeaking(true);
      onMuteMicrophone?.(true);
    },
    () => {
      console.log('MIA stopped speaking - unmuting microphone');
      setIsMiaSpeaking(false);
      // Delay unmuting slightly to avoid feedback
      setTimeout(() => {
        onMuteMicrophone?.(false);
      }, 500);
    },
    0.02 // Threshold for MIA detection
  );

  return { isMiaSpeaking: isSpeaking };
}
