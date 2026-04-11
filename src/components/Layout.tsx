import { useState, ReactNode, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  PlusCircle, 
  ListOrdered, 
  BarChart3, 
  LogOut, 
  Menu, 
  X,
  ShieldCheck,
  Sun,
  Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userEmail?: string;
}

export default function Layout({ children, activeTab, setActiveTab, userEmail }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') || 
             localStorage.getItem('theme') === 'dark';
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions', label: 'Daftar Transaksi', icon: ListOrdered },
    { id: 'reports', label: 'Laporan', icon: BarChart3 },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex transition-colors duration-300">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {!isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(true)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-20 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 80 }}
        className={cn(
          "fixed inset-y-0 left-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-30 transition-all duration-300 ease-in-out lg:relative",
          !isSidebarOpen && "lg:w-20"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shrink-0 shadow-blue-200 shadow-lg">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            {isSidebarOpen && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-bold text-xl text-slate-900 dark:text-white truncate"
              >
                MySamsat
              </motion.span>
            )}
          </div>

          {/* New Transaction Button */}
          <div className="px-4 mb-4">
            <Button
              onClick={() => setActiveTab('new-transaction')}
              className={cn(
                "w-full flex items-center gap-3 h-12 rounded-xl transition-all duration-300 shadow-lg",
                activeTab === 'new-transaction'
                  ? "bg-blue-600 text-white shadow-blue-500/40"
                  : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20"
              )}
            >
              <PlusCircle className="w-5 h-5 shrink-0" />
              {isSidebarOpen && <span className="font-bold">Transaksi Baru</span>}
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 space-y-2 mt-4">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group",
                  activeTab === item.id
                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
                )}
              >
                <item.icon className={cn(
                  "w-5 h-5 shrink-0",
                  activeTab === item.id ? "text-blue-600 dark:text-blue-400" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                )} />
                {isSidebarOpen && (
                  <span className="font-medium truncate">{item.label}</span>
                )}
              </button>
            ))}
          </nav>

          {/* User & Logout */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <Button
              variant="ghost"
              onClick={toggleDarkMode}
              className={cn(
                "w-full flex items-center gap-3 justify-start text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl",
                !isSidebarOpen && "justify-center px-0"
              )}
            >
              {isDarkMode ? <Sun className="w-5 h-5 shrink-0" /> : <Moon className="w-5 h-5 shrink-0" />}
              {isSidebarOpen && <span className="font-medium">{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>}
            </Button>

            {isSidebarOpen && userEmail && (
              <div className="px-3 py-2 mb-2">
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Petugas</p>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{userEmail}</p>
              </div>
            )}
            <Button
              variant="ghost"
              onClick={handleLogout}
              className={cn(
                "w-full flex items-center gap-3 justify-start text-slate-500 dark:text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl",
                !isSidebarOpen && "justify-center px-0"
              )}
            >
              <LogOut className="w-5 h-5 shrink-0" />
              {isSidebarOpen && <span className="font-medium">Keluar</span>}
            </Button>
          </div>
        </div>

        {/* Toggle Button */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute -right-3 top-20 w-6 h-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors hidden lg:flex"
        >
          {isSidebarOpen ? <X className="w-3 h-3 dark:text-slate-400" /> : <Menu className="w-3 h-3 dark:text-slate-400" />}
        </button>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header Mobile */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center px-6 lg:hidden shrink-0">
          <button onClick={() => setIsSidebarOpen(false)} className="mr-4">
            <Menu className="w-6 h-6 text-slate-600 dark:text-slate-400" />
          </button>
          <span className="font-bold text-lg text-slate-900 dark:text-white">MySamsat</span>
        </header>

        <div className="flex-1 overflow-y-auto p-6 lg:p-10">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
