
import { useState } from 'react';
import { useVAD } from './useVAD';

export function useMiaSpeaking(miaStream: MediaStream | null) {
  const [isMiaSpeaking, setIsMiaSpeaking] = useState(false);

  const { isSpeaking } = useVAD(
    miaStream,
    () => {
      console.log('MIA started speaking');
      setIsMiaSpeaking(true);
    },
    () => {
      console.log('MIA stopped speaking');
      setIsMiaSpeaking(false);
    },
    0.02 // Slightly higher threshold for MIA
  );

  return { isMiaSpeaking: isSpeaking };
}
