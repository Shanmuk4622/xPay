
import React from 'react';
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
  ShieldCheck,
  Cpu,
  Camera
} from 'lucide-react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, role, signOut } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

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

              <div className="hidden md:flex items-center gap-2">
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

            <div className="flex items-center gap-4">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => signOut()}
                className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all border border-slate-200"
              >
                <LogOut className="h-5 w-5" />
              </motion.button>
              <button className="md:hidden h-10 w-10 flex items-center justify-center rounded-xl bg-slate-900 text-white" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
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
