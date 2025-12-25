
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth, AppRole } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wallet, 
  LogOut, 
  LayoutDashboard, 
  Search, 
  PlusCircle, 
  Menu,
  X,
  Zap,
  Cpu,
  Camera,
  Command
} from 'lucide-react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { role, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  const navItems: Array<{ label: string; path: string; icon: any; roles?: AppRole[] }> = [
    { label: 'Pulse', path: '/', icon: LayoutDashboard },
    { label: 'Scanner', path: '/admin/scan', icon: Camera, roles: ['admin', 'super_admin'] },
    { label: 'Ledger', path: '/admin/search', icon: Search, roles: ['admin', 'super_admin'] },
    { label: 'Intelligence', path: '/intelligence', icon: Cpu, roles: ['admin', 'super_admin'] },
    { label: 'Entry', path: '/transactions/new', icon: PlusCircle, roles: ['admin', 'super_admin'] },
  ];

  const filteredNav = navItems.filter(item => 
    !item.roles || (role && item.roles.includes(role))
  );

  const handleGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!globalSearch.trim()) return;
    navigate(`/admin/search?q=${encodeURIComponent(globalSearch.trim())}`);
    setGlobalSearch('');
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('global-command-search');
        searchInput?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isAdmin = role === 'admin' || role === 'super_admin';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <nav className="sticky top-0 z-[100] border-b border-slate-200 bg-white/70 backdrop-blur-2xl no-print">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-20 justify-between items-center">
            <div className="flex items-center gap-10">
              <Link to="/" className="flex items-center group">
                <motion.div 
                  whileHover={{ scale: 1.05, rotate: 2 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow-xl"
                >
                  <Wallet className="h-5 w-5 text-white" />
                </motion.div>
                <span className="ml-4 text-2xl font-black tracking-tighter text-slate-900 hidden sm:block">
                  FinTrack<span className="text-indigo-600">Pro</span>
                </span>
              </Link>

              <div className="hidden lg:flex items-center gap-2">
                {filteredNav.map(item => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`relative px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                      location.pathname === item.path 
                      ? 'text-indigo-600' 
                      : 'text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    {location.pathname === item.path && (
                      <motion.div layoutId="nav-pill" className="absolute inset-0 bg-indigo-50 rounded-2xl -z-10" />
                    )}
                    <span className="flex items-center gap-2">
                      <item.icon className="h-3 w-3" />
                      {item.label}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-6">
              {isAdmin && (
                <form onSubmit={handleGlobalSearch} className="hidden md:flex relative items-center group">
                   <div className="absolute left-4 pointer-events-none">
                      <Search className="h-3.5 w-3.5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                   </div>
                   <input 
                     id="global-command-search"
                     type="text"
                     value={globalSearch}
                     onChange={(e) => setGlobalSearch(e.target.value)}
                     placeholder="Global Search..."
                     className="bg-slate-100 border-none rounded-2xl h-10 pl-10 pr-16 text-[10px] font-black uppercase tracking-widest text-slate-900 placeholder:text-slate-400 focus:ring-4 focus:ring-indigo-600/5 transition-all w-48 focus:w-80 shadow-inner"
                   />
                   <div className="absolute right-3 hidden md:flex items-center gap-1 bg-white px-1.5 py-0.5 rounded-md border border-slate-200 opacity-50">
                      <Command className="h-2 w-2 text-slate-500" />
                      <span className="text-[8px] font-black text-slate-500">K</span>
                   </div>
                </form>
              )}

              <div className="flex items-center gap-4">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => signOut()}
                  className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all border border-slate-200"
                >
                  <LogOut className="h-5 w-5" />
                </motion.button>
                <button className="lg:hidden h-10 w-10 flex items-center justify-center rounded-xl bg-slate-900 text-white" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                  {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden bg-white border-t border-slate-100 overflow-hidden"
            >
              <div className="p-4 space-y-2">
                {filteredNav.map(item => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-4 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest ${
                      location.pathname === item.path ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <main className="flex-grow">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="py-12 border-t border-slate-200 bg-white text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-300">Authorized Node • ISO-27001 Compliance</p>
      </footer>
    </div>
  );
};
