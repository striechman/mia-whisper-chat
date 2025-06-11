
import { Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AudioSetupStepProps {
  onCaptureAudio: () => void;
}

export function AudioSetupStep({ onCaptureAudio }: AudioSetupStepProps) {
  return (
    <div className="flex flex-col items-center gap-6 text-white/80">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-white mb-2">Step 2: Start listening to MIA</h2>
        <p className="text-white/70 mb-4">Now capture MIA's audio from the other tab</p>
        
        <div className="text-sm text-white/50 space-y-2 bg-white/5 p-4 rounded-lg max-w-md">
          <p className="font-semibold text-white/70">Detailed instructions:</p>
          <p>1️⃣ Click "Start listening to MIA" below</p>
          <p>2️⃣ Select "Chrome Tab" (not Window or Entire Screen)</p>
          <p>3️⃣ Choose the tab with MIA</p>
          <p>4️⃣ ✅ Make sure "Also share tab audio" is checked</p>
          <p>5️⃣ Click "Share"</p>
        </div>
      </div>
      
      <Button 
        onClick={onCaptureAudio}
        className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 text-lg rounded-lg font-semibold"
      >
        <Volume2 className="w-6 h-6 mr-2" />
        Start listening to MIA
      </Button>
      
      <div className="text-xs text-white/40 text-center max-w-md">
        The browser requires permission to prevent hidden recording - this is normal for other tabs too
      </div>
    </div>
  );
}
