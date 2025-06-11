
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InitialStepProps {
  onOpenMiaTab: () => void;
}

export function InitialStep({ onOpenMiaTab }: InitialStepProps) {
  return (
    <div className="flex flex-col items-center gap-6 text-white/80">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-white mb-2">Step 1: Open MIA in a new tab</h2>
        <p className="text-white/70 mb-4">Click the button below to open MIA in a separate tab</p>
        
        <div className="text-sm text-white/50 space-y-2 bg-white/5 p-4 rounded-lg max-w-md">
          <p className="font-semibold text-white/70">Instructions:</p>
          <p>1️⃣ Click "Open MIA in new tab"</p>
          <p>2️⃣ Fill in details in the new tab and click "Start"</p>
          <p>3️⃣ Return to this tab and proceed to the next step</p>
        </div>
      </div>
      
      <Button 
        onClick={onOpenMiaTab}
        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg rounded-lg font-semibold"
      >
        <ExternalLink className="w-6 h-6 mr-2" />
        Open MIA in new tab
      </Button>
    </div>
  );
}
