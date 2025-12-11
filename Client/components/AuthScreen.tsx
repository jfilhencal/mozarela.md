import React, { useState } from 'react';
import { User } from '../types';
import { loginUser, registerUser } from '../services/authService';
import { Activity, Lock, Mail, User as UserIcon, Building2, ChevronRight, Loader2 } from 'lucide-react';

interface AuthScreenProps {
  onLogin: (user: User) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [clinicName, setClinicName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const user = await loginUser(email, password);
        onLogin(user);
      } else {
        const user = await registerUser(fullName, email, password, clinicName);
        // Auto login after register
        localStorage.setItem('mozarela_user_id', user.id);
        onLogin(user);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      
      {/* Logo Section */}
      <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="bg-medical-600 p-3 rounded-2xl inline-block shadow-lg mb-4">
          <Activity className="h-10 w-10 text-white" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Mozarela.MD</h1>
        <p className="text-slate-500 mt-2">Veterinary Differential Diagnosis System</p>
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-500">
        {/* Header Tabs */}
        <div className="flex border-b border-slate-100">
          <button
            onClick={() => { setIsLogin(true); setError(null); }}
            className={`flex-1 py-4 text-sm font-medium transition-colors ${isLogin ? 'text-medical-600 border-b-2 border-medical-600 bg-medical-50/50' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(null); }}
            className={`flex-1 py-4 text-sm font-medium transition-colors ${!isLogin ? 'text-medical-600 border-b-2 border-medical-600 bg-medical-50/50' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100 flex items-center">
              <span className="font-medium mr-1">Error:</span> {error}
            </div>
          )}

          {!isLogin && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-medical-500 focus:border-transparent outline-none transition-all"
                    placeholder="Dr. Jane Doe"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Clinic Name (Optional)</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="text"
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-medical-500 focus:border-transparent outline-none transition-all"
                    placeholder="City Vet Clinic"
                  />
                </div>
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-medical-500 focus:border-transparent outline-none transition-all"
                placeholder="name@clinic.com"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-medical-500 focus:border-transparent outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-medical-600 hover:bg-medical-700 text-white font-semibold py-3 rounded-xl shadow-md hover:shadow-lg transition-all transform active:scale-95 flex items-center justify-center mt-4"
          >
            {isLoading ? (
              <Loader2 className="animate-spin w-5 h-5" />
            ) : (
              <>
                {isLogin ? 'Sign In' : 'Create Account'}
                <ChevronRight className="w-5 h-5 ml-2" />
              </>
            )}
          </button>
        </form>
        
        <div className="bg-slate-50 px-8 py-4 text-center border-t border-slate-100">
          <p className="text-xs text-slate-500">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button 
              onClick={() => { setIsLogin(!isLogin); setError(null); }}
              className="text-medical-600 font-semibold ml-1 hover:underline"
            >
              {isLogin ? "Sign up" : "Log in"}
            </button>
          </p>
        </div>
      </div>
      
      <p className="mt-8 text-xs text-slate-400 text-center max-w-sm">
        By using Mozarela.MD, you agree that this tool is for educational and assistive purposes only.
      </p>
    </div>
  );
};

export default AuthScreen;