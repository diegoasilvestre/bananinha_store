import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type AuthMode = 'signin' | 'signup' | 'forgot';

export function LoginPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/account', { replace: true });
    }
  }, [user, navigate]);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          throw new Error('E-mail ou senha incorretos. Verifique suas credenciais.');
        }
        throw signInError;
      }

      navigate('/account', { replace: true });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Erro ao fazer login.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      setLoading(false);
      return;
    }

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          throw new Error('Este e-mail já está cadastrado. Tente fazer login.');
        }
        throw signUpError;
      }

      setSuccess('Conta criada com sucesso! Verifique seu e-mail para confirmar o cadastro.');
      setMode('signin');
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Erro ao criar conta.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/account`,
      });

      if (resetError) throw resetError;

      setSuccess('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Erro ao enviar e-mail de recuperação.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);

    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/account`,
        },
      });

      if (oauthError) throw oauthError;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Erro ao fazer login com Google.';
      setError(errMsg);
      setLoading(false);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError(null);
    setSuccess(null);
  };

  const headingMap: Record<AuthMode, string> = {
    signin: 'ENTRAR NA CONTA',
    signup: 'CRIAR CONTA',
    forgot: 'RECUPERAR SENHA',
  };

  const subtitleMap: Record<AuthMode, string> = {
    signin: 'Acesse sua conta para gerenciar pedidos e favoritos.',
    signup: 'Crie sua conta para uma experiência de compra personalizada.',
    forgot: 'Informe seu e-mail para receber o link de recuperação.',
  };

  return (
    <div
      className="flex-grow relative min-h-[calc(100vh-var(--header-height))] flex items-center justify-center overflow-hidden"
      style={{
        backgroundImage: "url('/background-loja.jfif')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-preto/70 backdrop-blur-[2px] z-0" />

      {/* Decorative gold accent lines */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-dourado to-transparent z-10" />
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-dourado to-transparent z-10" />

      <div className="relative z-10 w-full max-w-md mx-auto px-4 py-10">
        {/* Card */}
        <div className="bg-preto/80 backdrop-blur-md border border-dourado/30 rounded-xl shadow-2xl overflow-hidden">
          {/* Gold top bar */}
          <div className="h-1.5 bg-gradient-to-r from-dourado/40 via-dourado to-dourado/40" />

          <div className="p-8 space-y-6">
            {/* Logo / Branding */}
            <div className="text-center space-y-2">
              <img
                src="/logo.png"
                alt="Bananinha Store"
                className="h-12 mx-auto object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <h1 className="font-heading text-3xl text-dourado tracking-wider">
                {headingMap[mode]}
              </h1>
              <p className="text-xs text-verde-claro/70 font-light">
                {subtitleMap[mode]}
              </p>
            </div>

            {/* Alerts */}
            {error && (
              <div className="bg-vermelho-alerta/10 border border-vermelho-alerta/30 text-vermelho-alerta p-3 rounded-lg text-xs flex items-start space-x-2 animate-pulse-subtle">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="bg-green-500/10 border border-green-500/30 text-green-400 p-3 rounded-lg text-xs flex items-start space-x-2">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            {/* Google OAuth */}
            {mode !== 'forgot' && (
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center space-x-3 bg-branco hover:bg-cinza-claro text-preto py-3 rounded-lg text-sm font-semibold transition-all duration-300 hover:shadow-lg disabled:opacity-50 group"
                aria-label="Entrar com Google"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                <span className="group-hover:translate-x-0.5 transition-transform">
                  Entrar com Google
                </span>
              </button>
            )}

            {/* Divider */}
            {mode !== 'forgot' && (
              <div className="flex items-center space-x-3">
                <div className="flex-1 h-px bg-dourado/20" />
                <span className="text-[10px] text-verde-claro/50 font-semibold uppercase tracking-widest">
                  ou use e-mail
                </span>
                <div className="flex-1 h-px bg-dourado/20" />
              </div>
            )}

            {/* Form */}
            <form
              onSubmit={
                mode === 'signin'
                  ? handleEmailSignIn
                  : mode === 'signup'
                    ? handleEmailSignUp
                    : handleForgotPassword
              }
              className="space-y-4"
            >
              {/* Full Name (sign-up only) */}
              {mode === 'signup' && (
                <div className="space-y-1.5">
                  <label htmlFor="login-name" className="text-xs font-semibold text-dourado/80 block tracking-wide">
                    NOME COMPLETO
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dourado/40" />
                    <input
                      id="login-name"
                      type="text"
                      required
                      placeholder="Seu nome completo"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-preto/60 border border-dourado/20 rounded-lg pl-10 pr-4 py-2.5 text-sm text-branco placeholder:text-verde-claro/30 focus:outline-none focus:ring-2 focus:ring-dourado/50 focus:border-dourado/50 transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div className="space-y-1.5">
                <label htmlFor="login-email" className="text-xs font-semibold text-dourado/80 block tracking-wide">
                  E-MAIL
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dourado/40" />
                  <input
                    id="login-email"
                    type="email"
                    required
                    placeholder="seu-email@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-preto/60 border border-dourado/20 rounded-lg pl-10 pr-4 py-2.5 text-sm text-branco placeholder:text-verde-claro/30 focus:outline-none focus:ring-2 focus:ring-dourado/50 focus:border-dourado/50 transition-all"
                  />
                </div>
              </div>

              {/* Password (not in forgot mode) */}
              {mode !== 'forgot' && (
                <div className="space-y-1.5">
                  <label htmlFor="login-password" className="text-xs font-semibold text-dourado/80 block tracking-wide">
                    SENHA
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dourado/40" />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      placeholder={mode === 'signup' ? 'Mínimo 6 caracteres' : 'Sua senha'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-preto/60 border border-dourado/20 rounded-lg pl-10 pr-12 py-2.5 text-sm text-branco placeholder:text-verde-claro/30 focus:outline-none focus:ring-2 focus:ring-dourado/50 focus:border-dourado/50 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-dourado/40 hover:text-dourado transition-colors"
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Forgot password link (sign-in only) */}
              {mode === 'signin' && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    className="text-[11px] text-dourado/60 hover:text-dourado transition-colors font-medium underline underline-offset-2"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-dourado to-dourado-claro hover:from-dourado-claro hover:to-dourado text-preto py-3 rounded-lg text-xs font-bold tracking-widest uppercase transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg hover:shadow-dourado/30 disabled:opacity-50 group"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <span>
                      {mode === 'signin' ? 'ENTRAR' : mode === 'signup' ? 'CRIAR CONTA' : 'ENVIAR LINK'}
                    </span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            {/* Mode toggle */}
            <div className="text-center space-y-2 pt-2">
              {mode === 'signin' && (
                <p className="text-xs text-verde-claro/60">
                  Não tem conta?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('signup')}
                    className="text-dourado font-semibold hover:text-dourado-claro transition-colors underline underline-offset-2"
                  >
                    Criar conta grátis
                  </button>
                </p>
              )}

              {mode === 'signup' && (
                <p className="text-xs text-verde-claro/60">
                  Já tem conta?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('signin')}
                    className="text-dourado font-semibold hover:text-dourado-claro transition-colors underline underline-offset-2"
                  >
                    Fazer login
                  </button>
                </p>
              )}

              {mode === 'forgot' && (
                <p className="text-xs text-verde-claro/60">
                  Lembrou a senha?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('signin')}
                    className="text-dourado font-semibold hover:text-dourado-claro transition-colors underline underline-offset-2"
                  >
                    Voltar ao login
                  </button>
                </p>
              )}
            </div>
          </div>

          {/* Bottom gold bar */}
          <div className="h-1.5 bg-gradient-to-r from-dourado/40 via-dourado to-dourado/40" />
        </div>

        {/* Footer text */}
        <p className="text-center text-[10px] text-verde-claro/30 mt-4 font-light">
          Ao continuar, você concorda com os Termos de Uso e Política de Privacidade.
        </p>
      </div>
    </div>
  );
}
