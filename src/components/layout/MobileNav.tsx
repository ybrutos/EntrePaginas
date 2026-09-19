'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Search, Library, Trophy, User } from 'lucide-react';

export default function MobileNav() {
  const pathname = usePathname();

  const navItems = [
    { label: 'Início', href: '/', icon: BookOpen },
    { label: 'Buscar', href: '/buscar', icon: Search },
    { label: 'Biblioteca', href: '/biblioteca', icon: Library },
    { label: 'Conquistas', href: '/conquistas', icon: Trophy },
    { label: 'Perfil', href: '/karolayne', icon: User },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-header border-t border-[#EADFD0] px-3 py-2 safe-bottom shadow-[0_-4px_16px_rgba(44,34,36,0.06)]">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all duration-200 ${
                isActive ? 'text-[#722F37]' : 'text-[#725E62] hover:text-[#2C2224]'
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-all ${
                  isActive ? 'bg-[#722F37]/10 scale-110' : ''
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-[#722F37] stroke-[2.5]' : 'stroke-[1.75]'}`} />
              </div>
              <span className={`text-[10px] font-medium tracking-tight ${isActive ? 'font-bold text-[#722F37]' : ''}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
