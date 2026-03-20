
import React, { useState, useEffect } from 'react';
import { Droplets, Lock, Delete } from 'lucide-react';

interface LoginPinProps {
  onSuccess: () => void;
}

const REQUIRED_PIN = "244100";

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
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [pin, onSuccess]);

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center px-8 bg-slate-950 overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-cyan-600/10 rounded-full blur-[80px]" />

      {/* Branding */}
      <div className="flex flex-col items-center mb-12 space-y-6 relative z-10">
        <div className="relative">
          <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full scale-125" />
          <div className="relative w-24 h-24 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-[32px] flex items-center justify-center shadow-2xl shadow-blue-500/20 border border-white/10">
            <Droplets className="text-white" size={48} />
          </div>
        </div>
        <div className="text-center">
          <h1 className="text-4xl font-black text-white tracking-tighter">CrystalOne</h1>
          <div className="flex items-center justify-center gap-2 mt-2">
            <Lock size={14} className="text-blue-400" />
            <span className="text-[10px] text-blue-400 font-bold uppercase tracking-[0.4em] opacity-60">Acesso Restrito</span>
          </div>
        </div>
      </div>

      {/* PIN Display */}
      <div className="flex flex-col items-center mb-12 relative z-10">
        <div className={`flex gap-4 ${error ? 'animate-shake' : ''}`}>
          {[...Array(6)].map((_, i) => (
            <div 
              key={i} 
              className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${
                pin.length > i 
                  ? (error ? 'bg-red-500 border-red-500 scale-125' : 'bg-blue-600 border-blue-600 scale-110 shadow-lg shadow-blue-500/40') 
                  : 'border-white/20 bg-transparent'
              }`}
            />
          ))}
        </div>
        
        {error && (
          <p className="text-red-500 text-[11px] font-black uppercase tracking-widest mt-6 animate-pulse">
            Senha Incorreta
          </p>
        )}
      </div>

      {/* Numeric Keypad */}
      <div className="grid grid-cols-3 gap-6 w-full max-w-xs relative z-10">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
          <button
            key={num}
            onClick={() => handleKeyPress(num)}
            className="w-full aspect-square rounded-3xl bg-white/5 border border-white/10 shadow-sm text-2xl font-black text-white active:scale-90 active:bg-blue-600 transition-all flex items-center justify-center hover:bg-white/10"
          >
            {num}
          </button>
        ))}
        <div /> {/* Spacer */}
        <button
          onClick={() => handleKeyPress('0')}
          className="w-full aspect-square rounded-3xl bg-white/5 border border-white/10 shadow-sm text-2xl font-black text-white active:scale-90 active:bg-blue-600 transition-all flex items-center justify-center hover:bg-white/10"
        >
          0
        </button>
        <button
          onClick={handleDelete}
          className="w-full aspect-square rounded-3xl bg-white/5 border border-white/10 text-slate-400 active:scale-90 active:text-red-500 transition-all flex items-center justify-center hover:bg-white/10"
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
