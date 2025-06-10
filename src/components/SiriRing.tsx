
interface SiriRingProps {
  isActive: boolean;
}

export function SiriRing({ isActive }: SiriRingProps) {
  if (!isActive) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="siri-ring w-32 h-32 rounded-full bg-gradient-to-tr from-fuchsia-500 to-violet-500 animate-pulse opacity-70" />
      <div className="siri-ring absolute w-24 h-24 rounded-full bg-gradient-to-tr from-pink-400 to-purple-400 animate-pulse opacity-50" />
      <div className="siri-ring absolute w-16 h-16 rounded-full bg-gradient-to-tr from-fuchsia-300 to-violet-300 animate-pulse opacity-30" />
    </div>
  );
}
