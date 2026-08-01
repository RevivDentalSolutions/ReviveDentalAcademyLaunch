'use client';

import Link from 'next/link';
import Image from 'next/image';

const navLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/tools', label: 'AI Tools' },
  { href: '/templates', label: 'Templates' },
  { href: '/pricing', label: 'Pricing' },
];

export default function Header() {
  return (
    <header className="bg-white border-b border-charcoal-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-mint-400 to-teal-500 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <span className="font-display font-semibold text-xl text-charcoal-900">
              Revive Dental
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="nav-link text-sm font-medium text-charcoal-700 hover:text-charcoal-900"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* CTA Buttons */}
          <div className="flex items-center gap-3">
            <button className="btn-ghost text-sm font-medium hidden sm:block">
              Sign In
            </button>
            <Link href="/dashboard" className="btn-accent text-sm font-medium">
              Dashboard
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden p-2 rounded-lg hover:bg-cream-200">
            <svg className="w-6 h-6 text-charcoal-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
