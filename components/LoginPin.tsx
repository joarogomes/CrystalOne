
import React, { useState, useEffect } from 'react';
import { Droplets, Lock, Delete } from 'lucide-react';

interface LoginPinProps {
  onSuccess: () => void;
}

const REQUIRED_PIN = "244126";

const LoginPin: React.FC<LoginPinProps> = ({ onSuccess }) => {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState(false);

  const handleKeyPress = (val: string) => {
    if (pin.length < 6) {
      setError(false);
      setPin(prev => prev + val);
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError(false);
  };

  useEffect(() => {
    if (pin.length === 6) {
      if (pin === REQUIRED_PIN) {
        onSuccess();
      } else {
        setError(true);
        // Pequeno delay para mostrar o erro antes de limpar
        const timer = setTimeout(() => {
          setPin('');
          setError(false);
        }, 600);
        return () => clearTimeout(timer);
      }
    }
  }, [pin, onSuccess]);

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center px-8 bg-blue-50/20 backdrop-blur-xl animate-premium">
      {/* Branding */}
      <div className="flex flex-col items-center mb-16 space-y-4">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-[30px] flex items-center justify-center shadow-2xl shadow-blue-500/30 ring-8 ring-white/50">
          <Droplets className="text-white" size={40} />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">CrystalOne</h1>
          <div className="flex items-center justify-center gap-2 mt-1">
            <Lock size={12} className="text-blue-600" />
            <span className="text-[10px] text-blue-600 font-black uppercase tracking-[0.4em]">Acesso Restrito</span>
          </div>
        </div>
      </div>

      {/* PIN Display */}
      <div className={`flex gap-4 mb-16 ${error ? 'animate-shake' : ''}`}>
        {[...Array(6)].map((_, i) => (
          <div 
            key={i} 
            className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${
              pin.length > i 
                ? (error ? 'bg-red-500 border-red-500 scale-125' : 'bg-blue-600 border-blue-600 scale-110 shadow-lg shadow-blue-500/40') 
                : 'border-slate-300 bg-transparent'
            }`}
          />
        ))}
      </div>

      {/* Numeric Keypad */}
      <div className="grid grid-cols-3 gap-6 w-full max-w-xs">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
          <button
            key={num}
            onClick={() => handleKeyPress(num)}
            className="w-full aspect-square rounded-3xl bg-white/60 border border-white/80 shadow-sm text-2xl font-black text-slate-800 active:scale-90 active:bg-blue-600 active:text-white transition-all flex items-center justify-center"
          >
            {num}
          </button>
        ))}
        <div /> {/* Spacer */}
        <button
          onClick={() => handleKeyPress('0')}
          className="w-full aspect-square rounded-3xl bg-white/60 border border-white/80 shadow-sm text-2xl font-black text-slate-800 active:scale-90 active:bg-blue-600 active:text-white transition-all flex items-center justify-center"
        >
          0
        </button>
        <button
          onClick={handleDelete}
          className="w-full aspect-square rounded-3xl bg-white/10 text-slate-400 active:scale-90 active:text-red-500 transition-all flex items-center justify-center"
        >
          <Delete size={28} />
        </button>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
        .animate-shake {
          animation: shake 0.2s ease-in-out 0s 2;
        }
      `}</style>
    </div>
  );
};

export default LoginPin;
