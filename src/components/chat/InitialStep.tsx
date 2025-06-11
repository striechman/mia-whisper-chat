
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InitialStepProps {
  onOpenMiaTab: () => void;
}

export function InitialStep({ onOpenMiaTab }: InitialStepProps) {
  return (
    <div className="flex flex-col items-center gap-6 text-white/80">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-white mb-2">שלב 1: פתח את MIA בטאב חדש</h2>
        <p className="text-white/70 mb-4">לחץ על הכפתור למטה כדי לפתוח את MIA בטאב נפרד</p>
        
        <div className="text-sm text-white/50 space-y-2 bg-white/5 p-4 rounded-lg max-w-md">
          <p className="font-semibold text-white/70">הוראות:</p>
          <p>1️⃣ לחץ "פתח את MIA בטאב חדש"</p>
          <p>2️⃣ מלא פרטים בטאב החדש ולחץ "Start"</p>
          <p>3️⃣ חזור לטאב הזה ועבור לשלב הבא</p>
        </div>
      </div>
      
      <Button 
        onClick={onOpenMiaTab}
        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg rounded-lg font-semibold"
      >
        <ExternalLink className="w-6 h-6 mr-2" />
        פתח את MIA בטאב חדש
      </Button>
    </div>
  );
}
