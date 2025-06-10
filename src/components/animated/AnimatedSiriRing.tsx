
import { motion } from 'framer-motion';

interface AnimatedSiriRingProps {
  isActive: boolean;
}

export function AnimatedSiriRing({ isActive }: AnimatedSiriRingProps) {
  if (!isActive) return null;

  return (
    <div className="absolute bottom-32 left-1/2 -translate-x-1/2 pointer-events-none">
      <motion.div
        animate={{
          scale: [0.8, 1, 0.8],
          opacity: [0.3, 0.7, 0.3]
        }}
        transition={{
          duration: 1.2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="w-32 h-32 rounded-full bg-gradient-to-tr from-fuchsia-500 to-violet-500"
      />
      <motion.div
        animate={{
          scale: [0.6, 0.8, 0.6],
          opacity: [0.2, 0.5, 0.2]
        }}
        transition={{
          duration: 1.2,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.1
        }}
        className="absolute top-4 left-4 w-24 h-24 rounded-full bg-gradient-to-tr from-pink-400 to-purple-400"
      />
      <motion.div
        animate={{
          scale: [0.4, 0.6, 0.4],
          opacity: [0.1, 0.3, 0.1]
        }}
        transition={{
          duration: 1.2,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.2
        }}
        className="absolute top-8 left-8 w-16 h-16 rounded-full bg-gradient-to-tr from-fuchsia-300 to-violet-300"
      />
    </div>
  );
}
