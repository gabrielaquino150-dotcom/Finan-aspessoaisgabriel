import React, { useState } from 'react';
import { apiAuth } from '../services/api';
import { User } from '../types';
import { KeyRound, Mail, User as UserIcon, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';

interface Props {
  onLoginSuccess: (user: User) => void;
}

const AuthScreen: React.FC<Props> = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let user: User;
      if (isLogin) {
        user = await apiAuth.login(formData.email, formData.password);
      } else {
        if (!formData.name) throw new Error("Nome é obrigatório");
        user = await apiAuth.register(formData.name, formData.email, formData.password);
      }
      onLoginSuccess(user);
    } catch (err: any) {
      setError(err.message || "Ocorreu um erro no sistema.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      
      {/* Brand Header */}
      <div className="mb-8 text-center">
        <div className="w-16 h-16 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-emerald-900/20">
            <span className="text-2xl font-bold text-emerald-500">EF</span>
        </div>
        <h1 className="text-3xl font-bold text-slate-100 tracking-tight">Equilibrium Financial</h1>
        <p className="text-slate-500 mt-2 font-mono text-xs tracking-widest uppercase">Sistema Operacional de Capital</p>
      </div>

      {/* Auth Card */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden">
        
        {/* Toggle */}
        <div className="flex border-b border-slate-800">
          <button
            onClick={() => { setIsLogin(true); setError(''); }}
            className={`flex-1 py-4 text-sm font-medium transition-colors ${isLogin ? 'text-emerald-500 bg-slate-800/50' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Acesso Seguro
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(''); }}
            className={`flex-1 py-4 text-sm font-medium transition-colors ${!isLogin ? 'text-emerald-500 bg-slate-800/50' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Nova Conta
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {error && (
            <div className="bg-rose-950/30 border border-rose-900/50 text-rose-400 p-3 rounded text-sm flex items-center gap-2">
                <ShieldCheck size={16} />
                {error}
            </div>
          )}

          {!isLogin && (
            <div className="space-y-1">
                <label className="text-xs text-slate-400 font-medium ml-1">Nome Completo</label>
                <div className="relative group">
                    <UserIcon size={18} className="absolute left-3 top-3 text-slate-500 group-focus-within:text-emerald-500 transition-colors" />
                    <input
                        type="text"
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-10 text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                        placeholder="Seu nome"
                    />
                </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs text-slate-400 font-medium ml-1">E-mail Corporativo/Pessoal</label>
            <div className="relative group">
                <Mail size={18} className="absolute left-3 top-3 text-slate-500 group-focus-within:text-emerald-500 transition-colors" />
                <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-10 text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                    placeholder="voce@exemplo.com"
                />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-400 font-medium ml-1">Chave de Acesso (Senha)</label>
            <div className="relative group">
                <KeyRound size={18} className="absolute left-3 top-3 text-slate-500 group-focus-within:text-emerald-500 transition-colors" />
                <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-10 text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                    placeholder="••••••••"
                />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-lg shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 transition-all active:scale-[0.99] mt-4"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : (
                <>
                    {isLogin ? 'Acessar Sistema' : 'Criar Registro'}
                    <ArrowRight size={18} />
                </>
            )}
          </button>
        </form>
      </div>

      <p className="mt-8 text-slate-600 text-xs text-center max-w-xs">
        Ambiente seguro com criptografia de ponta a ponta simulada. 
        <br/>Versão 2.0.0 - Build Stable
      </p>
    </div>
  );
};

export default AuthScreen;
