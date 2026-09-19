'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  BookOpen, 
  Sparkles, 
  Trophy, 
  Library, 
  BarChart3, 
  Search, 
  User, 
  LogOut, 
  Shield, 
  Compass, 
  LogIn, 
  UserPlus 
} from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const fetchCurrentUser = () => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.user) setCurrentUser(data.user);
        else setCurrentUser(null);
      })
      .catch(() => setCurrentUser(null));
  };

  useEffect(() => {
    fetchCurrentUser();
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setCurrentUser(null);
      router.push('/');
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  const navItems = [
    { label: 'Início', href: '/', icon: BookOpen },
    { label: 'Explorar', href: '/buscar', icon: Search },
    { label: 'Gêneros', href: '/explorar', icon: Compass },
    ...(currentUser ? [{ label: 'Biblioteca', href: '/biblioteca', icon: Library }] : []),
    { label: 'Ranking', href: '/ranking', icon: Trophy },
  ];

  return (
    <header className="sticky top-0 z-40 w-full glass-header border-b border-[#EADFD0] px-4 md:px-8 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand / Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#722F37] to-[#4A1C23] flex items-center justify-center text-white shadow-book group-hover:scale-105 transition-transform duration-200">
            <BookOpen className="w-5 h-5 text-[#FAF8F5]" />
          </div>
          <div>
            <span className="font-serif text-2xl font-bold tracking-tight text-[#2C2224] flex items-center gap-1.5">
              Entre Páginas
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37] inline-block animate-pulse" />
            </span>
            <span className="text-[10px] uppercase tracking-widest text-[#725E62] block font-medium">
              Onde cada livro vira uma nova jornada
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-[#722F37] text-white shadow-sm'
                    : 'text-[#725E62] hover:text-[#2C2224] hover:bg-[#F4EFE6]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#FAF8F5]' : 'text-[#725E62]'}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Auth / Profile Area */}
        <div className="flex items-center gap-2.5">
          {currentUser ? (
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-3 pl-3 pr-3.5 py-1.5 rounded-full bg-[#F4EFE6] border border-[#EADFD0] hover:border-[#C97D8A]/50 transition-all duration-200 shadow-sm group"
              >
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#C97D8A] to-[#722F37] flex items-center justify-center text-white text-xs font-semibold overflow-hidden border border-white">
                    {currentUser.avatarUrl ? (
                      <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-4 h-4" />
                    )}
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#D4AF37] text-[#2C2224] text-[9px] font-bold flex items-center justify-center border border-white">
                    {currentUser.levelInfo?.level || currentUser.level || 1}
                  </span>
                </div>

                <div className="hidden sm:block text-left">
                  <div className="text-xs font-bold text-[#2C2224] leading-tight group-hover:text-[#722F37] transition-colors truncate max-w-[120px]">
                    {currentUser.name.split(' ')[0]}
                  </div>
                  <div className="text-[10px] text-[#725E62] leading-none">
                    {currentUser.levelInfo?.title || currentUser.levelTitle || 'Leitor'}
                  </div>
                </div>
              </button>

              {/* Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-white border border-[#EADFD0] shadow-xl py-2 z-50 animate-fadeIn">
                  <div className="px-4 py-2 border-b border-[#EADFD0]/60">
                    <p className="text-xs font-bold text-[#2C2224] truncate">{currentUser.name}</p>
                    <p className="text-[11px] text-[#725E62] truncate">@{currentUser.username}</p>
                  </div>

                  <Link
                    href={`/u/${currentUser.username}`}
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-[#2C2224] hover:bg-[#F4EFE6] transition-colors"
                  >
                    <User className="w-3.5 h-3.5 text-[#722F37]" />
                    Meu Perfil Público
                  </Link>

                  <Link
                    href="/biblioteca"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-[#2C2224] hover:bg-[#F4EFE6] transition-colors"
                  >
                    <Library className="w-3.5 h-3.5 text-[#722F37]" />
                    Minha Estante
                  </Link>

                  <Link
                    href="/conquistas"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-[#2C2224] hover:bg-[#F4EFE6] transition-colors"
                  >
                    <Trophy className="w-3.5 h-3.5 text-[#D4AF37]" />
                    Minhas Conquistas
                  </Link>

                  {currentUser.role === 'ADMIN' && (
                    <Link
                      href="/admin/providers"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-amber-800 bg-amber-50/50 hover:bg-amber-100/60 transition-colors"
                    >
                      <Shield className="w-3.5 h-3.5 text-amber-600" />
                      Status dos Provedores
                    </Link>
                  )}

                  <div className="border-t border-[#EADFD0]/60 mt-1 pt-1">
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sair da Conta
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-3.5 py-1.5 rounded-xl border border-[#EADFD0] hover:border-[#722F37] text-xs font-semibold text-[#2C2224] hover:text-[#722F37] transition-colors"
              >
                Entrar
              </Link>
              <Link
                href="/cadastro"
                className="px-4 py-1.5 rounded-xl bg-[#722F37] hover:bg-[#581825] text-white text-xs font-semibold shadow-sm transition-transform active:scale-95"
              >
                Criar Conta
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
