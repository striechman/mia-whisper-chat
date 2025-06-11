
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export function useChatSteps() {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [miaTabOpened, setMiaTabOpened] = useState(false);
  const { toast } = useToast();

  const openMiaInNewTab = () => {
    window.open("https://online.meetinginsights.audiocodes.com/uigpt/miamarketing/index.php", "_blank");
    setMiaTabOpened(true);
    setStep(1);
    
    toast({
      title: "MIA נפתחה בטאב חדש!",
      description: "מלא את הפרטים בטאב החדש ולחץ 'Start'. אחר כך חזור לכאן ולחץ 'התחל להאזין ל-MIA'.",
    });
  };

  const goToStep = (newStep: 0 | 1 | 2) => {
    setStep(newStep);
  };

  return {
    step,
    miaTabOpened,
    openMiaInNewTab,
    goToStep,
    setStep
  };
}
