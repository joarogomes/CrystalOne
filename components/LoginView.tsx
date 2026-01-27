
import React, { useState } from 'react';
import { User, Lock, Droplets, ChevronRight, Eye, EyeOff, ShieldCheck, Mail, ArrowLeft, AlertCircle } from 'lucide-react';
import { supabase } from '../services/supabase';

interface LoginViewProps {
  onSuccess: () => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin
          }
        });
        
        if (signUpError) throw signUpError;
        
        if (data?.session) {
          onSuccess();
        } else {
          setSuccessMsg("CONTA CRIADA! Verifique seu e-mail para confirmar antes do login.");
          setIsSignUp(false);
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (signInError) throw signInError;
        if (data?.session) onSuccess();
      }
    } catch (err: any) {
      console.error("Erro de Autenticação:", err);
      // Mensagens amigáveis para erros comuns
      if (err.message.includes("Email not confirmed")) {
        setError("E-mail não confirmado. Clique no link enviado para sua caixa de entrada.");
      } else if (err.message.includes("Invalid login credentials")) {
        setError("Dados inválidos. Verifique e-mail e senha.");
      } else if (err.message.includes("Failed to fetch")) {
        setError("Erro de conexão. Verifique se o URL do Supabase está correto.");
      } else {
        setError(err.message || "Ocorreu um erro inesperado.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center px-8 bg-slate-950 overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-cyan-600/10 rounded-full blur-[80px]" />

      <div className="w-full max-w-sm space-y-10 relative z-10 animate-premium">
        <div className="flex flex-col items-center space-y-6">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full scale-125" />
            <div className="relative w-24 h-24 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-[32px] flex items-center justify-center shadow-2xl shadow-blue-500/20 border border-white/10">
               <Droplets className="text-white" size={48} />
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-black text-white tracking-tighter">Agua CMe</h1>
            <p className="text-[10px] text-blue-400 font-bold uppercase tracking-[0.4em] mt-1 opacity-60">
              {isSignUp ? 'Registro de Unidade' : 'Business Management'}
            </p>
          </div>
        </div>

        <form onSubmit={handleAuth} className={`space-y-4 ${error ? 'animate-shake' : ''}`}>
          <div className="space-y-1.5">
            <div className="relative group">
              <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500">
                <Mail size={18} />
              </div>
              <input 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Seu e-mail"
                className="w-full bg-white/5 border border-white/10 rounded-[24px] pl-14 pr-6 py-5 text-white font-bold placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="relative group">
              <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500">
                <Lock size={18} />
              </div>
              <input 
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Sua senha"
                className="w-full bg-white/5 border border-white/10 rounded-[24px] pl-14 pr-14 py-5 text-white font-bold placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                required
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-3 px-6 py-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-[10px] font-black uppercase tracking-wider">
              <AlertCircle size={18} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-start gap-3 px-6 py-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 text-[10px] font-black uppercase tracking-wider">
              <ShieldCheck size={18} className="flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white font-black py-5 rounded-[24px] shadow-2xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 mt-4 group"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                {isSignUp ? 'CRIAR CONTA' : 'ENTRAR'}
                <ChevronRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="pt-4 text-center">
          <button 
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-slate-400 text-[11px] font-black uppercase tracking-widest hover:text-blue-400 transition-colors"
          >
            {isSignUp ? "Voltar para o Login" : "Novo por aqui? Criar Conta"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
