import { useState, FormEvent } from 'react';
import { supabase, isSupabaseConfigured, updateSupabaseConfig } from '@/src/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { LogIn, UserPlus, ShieldCheck, AlertCircle, CheckCircle2, Settings2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [showConfig, setShowConfig] = useState(!isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Config State
  const [configUrl, setConfigUrl] = useState('');
  const [configKey, setConfigKey] = useState('');

  const handleAuth = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (!isSupabaseConfigured) {
      setError('Supabase belum dikonfigurasi. Silakan masukkan URL dan API Key.');
      setLoading(false);
      return;
    }

    try {
      if (isRegistering) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
          }
        });
        if (error) throw error;
        setSuccess('Pendaftaran berhasil! Silakan cek email Anda untuk konfirmasi.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat autentikasi');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = (e: FormEvent) => {
    e.preventDefault();
    if (!configUrl || !configKey) {
      setError('URL dan Key harus diisi.');
      return;
    }
    updateSupabaseConfig(configUrl, configKey);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg mb-4">
            <ShieldCheck className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">MySamsat</h1>
          <p className="text-slate-500">Sistem Rekap Transaksi STNK</p>
        </div>

        <AnimatePresence mode="wait">
          {showConfig ? (
            <motion.div
              key="config"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Card className="border-none shadow-xl bg-white">
                <CardHeader>
                  <div className="flex items-center gap-2 mb-1">
                    <Settings2 className="w-5 h-5 text-blue-600" />
                    <CardTitle>Konfigurasi Database</CardTitle>
                  </div>
                  <CardDescription>
                    Masukkan kredensial Supabase Anda untuk mengaktifkan aplikasi.
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleSaveConfig}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="configUrl">Supabase URL</Label>
                      <Input
                        id="configUrl"
                        placeholder="https://xyz.supabase.co"
                        value={configUrl}
                        onChange={(e) => setConfigUrl(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="configKey">Supabase Anon Key</Label>
                      <Input
                        id="configKey"
                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                        value={configKey}
                        onChange={(e) => setConfigKey(e.target.value)}
                        required
                      />
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-700 leading-relaxed">
                      <p className="font-bold mb-1">Cara mendapatkan:</p>
                      Buka dashboard Supabase &gt; Project Settings &gt; API. Salin <b>Project URL</b> dan <b>anon public key</b>.
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-3">
                    <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                      Simpan & Aktifkan
                    </Button>
                    {isSupabaseConfigured && (
                      <Button 
                        type="button" 
                        variant="ghost" 
                        className="w-full"
                        onClick={() => setShowConfig(false)}
                      >
                        Batal
                      </Button>
                    )}
                  </CardFooter>
                </form>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="auth"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>{isRegistering ? 'Daftar Akun' : 'Masuk'}</CardTitle>
                  <CardDescription>
                    {isRegistering 
                      ? 'Buat akun baru untuk mulai mengelola transaksi.' 
                      : 'Masukkan email dan password Anda untuk masuk.'}
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleAuth}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="admin@mysamsat.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="bg-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="bg-white"
                      />
                    </div>
                    
                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 text-sm text-red-600 font-medium"
                        >
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          {error}
                        </motion.div>
                      )}
                      {success && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center gap-2 text-sm text-emerald-600 font-medium"
                        >
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          {success}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                  <CardFooter className="flex flex-col space-y-4">
                    <Button 
                      type="submit" 
                      className="w-full bg-blue-600 hover:bg-blue-700" 
                      disabled={loading}
                    >
                      {loading ? 'Memproses...' : isRegistering ? (
                        <><UserPlus className="mr-2 h-4 w-4" /> Daftar</>
                      ) : (
                        <><LogIn className="mr-2 h-4 w-4" /> Masuk</>
                      )}
                    </Button>
                    <div className="flex flex-col w-full gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full text-slate-500 hover:text-blue-600"
                        onClick={() => {
                          setIsRegistering(!isRegistering);
                          setError(null);
                          setSuccess(null);
                        }}
                      >
                        {isRegistering ? 'Sudah punya akun? Masuk' : 'Belum punya akun? Daftar'}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full text-slate-400 text-xs"
                        onClick={() => setShowConfig(true)}
                      >
                        <Settings2 className="w-3 h-3 mr-1" /> Ubah Konfigurasi Database
                      </Button>
                    </div>
                  </CardFooter>
                </form>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
