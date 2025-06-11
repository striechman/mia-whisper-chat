
import { Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AudioSetupStepProps {
  onCaptureAudio: () => void;
}

export function AudioSetupStep({ onCaptureAudio }: AudioSetupStepProps) {
  return (
    <div className="flex flex-col items-center gap-6 text-white/80">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-white mb-2">שלב 2: התחל להאזין ל-MIA</h2>
        <p className="text-white/70 mb-4">כעת לכוד את האודיו של MIA מהטאב השני</p>
        
        <div className="text-sm text-white/50 space-y-2 bg-white/5 p-4 rounded-lg max-w-md">
          <p className="font-semibold text-white/70">הוראות מפורטות:</p>
          <p>1️⃣ לחץ "התחל להאזין ל-MIA" למטה</p>
          <p>2️⃣ בחר "Chrome Tab" (לא Window או Entire Screen)</p>
          <p>3️⃣ בחר את הטאב עם MIA</p>
          <p>4️⃣ ✅ ודא שמסומן "Also share tab audio"</p>
          <p>5️⃣ לחץ "Share"</p>
        </div>
      </div>
      
      <Button 
        onClick={onCaptureAudio}
        className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 text-lg rounded-lg font-semibold"
      >
        <Volume2 className="w-6 h-6 mr-2" />
        התחל להאזין ל-MIA
      </Button>
      
      <div className="text-xs text-white/40 text-center max-w-md">
        הדפדפן דורש הרשאה למניעת הקלטה נסתרת - זה נורמלי גם לטאב אחר
      </div>
    </div>
  );
}
