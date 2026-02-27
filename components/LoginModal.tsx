import React, { useState } from 'react';
import { apiAuth } from '../services/api';
import { User } from '../types';
import { X, Loader2, LogIn, UserPlus } from 'lucide-react';

interface Props {
  onSuccess: (user: User) => void;
  onClose: () => void;
}

const LoginModal: React.FC<Props> = ({ onSuccess, onClose }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let user: User;
      if (isRegister) {
        user = await apiAuth.register(name, email, password);
      } else {
        user = await apiAuth.login(email, password);
      }
      onSuccess(user);
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            {isRegister ? <UserPlus className="text-emerald-400" /> : <LogIn className="text-emerald-400" />}
            {isRegister ? 'Criar Conta' : 'Acessar Equilibrium'}
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-rose-900/30 border border-rose-900/50 text-rose-400 p-3 rounded text-sm">
              {error}
            </div>
          )}

          {isRegister && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Nome Completo</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                placeholder="Seu nome"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Senha</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : (isRegister ? 'Cadastrar' : 'Entrar')}
          </button>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              className="text-sm text-slate-400 hover:text-emerald-400 transition-colors"
            >
              {isRegister ? 'Já tem uma conta? Entre aqui' : 'Não tem conta? Cadastre-se agora'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginModal;
