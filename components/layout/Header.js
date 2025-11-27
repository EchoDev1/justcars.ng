/**
 * Main Header Component for Public Pages
 * Responsive with mobile hamburger menu
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Car, Menu, X, Search, User, Heart, MessageCircle, LogOut, Settings } from 'lucide-react'
import Button from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const { user, isAuthenticated, isBuyer, signOut } = useAuth()

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/cars', label: 'Browse Cars' },
    { href: '/luxury', label: 'Luxury' },
    { href: '#about', label: 'About' },
    { href: '#contact', label: 'Contact' }
  ]

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }

  const toggleMobileSearch = () => {
    setMobileSearchOpen(!mobileSearchOpen)
  }

  const toggleAccountMenu = () => {
    setAccountMenuOpen(!accountMenuOpen)
  }

  const handleSignOut = async () => {
    await signOut()
    setAccountMenuOpen(false)
  }

  return (
    <>
      <header className="header-modern">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2 logo-link">
              <Car className="text-accent-blue icon-animated" size={32} />
              <span className="text-2xl font-bold text-white">
                JustCars<span className="text-accent-blue">.ng</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="header-nav-link"
                >
                  {link.label}
                </Link>
              ))}

              {/* Account Button - Shows buyer account if authenticated */}
              {isAuthenticated ? (
                <div className="relative">
                  <button
                    onClick={toggleAccountMenu}
                    className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg transition-all border border-white/20"
                  >
                    <User size={20} className="text-white" />
                    <span className="text-white font-medium">My Account</span>
                  </button>

                  {/* Dropdown Menu */}
                  {accountMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-2xl border border-gray-200 py-2 z-50">
                      <div className="px-4 py-3 border-b border-gray-200">
                        <p className="text-sm text-gray-500">Signed in as</p>
                        <p className="text-sm font-medium text-gray-900 truncate">{user?.email}</p>
                      </div>

                      <Link
                        href="/buyer/saved"
                        className="flex items-center space-x-2 px-4 py-2 hover:bg-gray-50 text-gray-700"
                        onClick={() => setAccountMenuOpen(false)}
                      >
                        <Heart size={18} />
                        <span>Saved Cars</span>
                      </Link>

                      <Link
                        href="/buyer/chats"
                        className="flex items-center space-x-2 px-4 py-2 hover:bg-gray-50 text-gray-700"
                        onClick={() => setAccountMenuOpen(false)}
                      >
                        <MessageCircle size={18} />
                        <span>My Chats</span>
                      </Link>

                      <Link
                        href="/buyer/settings"
                        className="flex items-center space-x-2 px-4 py-2 hover:bg-gray-50 text-gray-700"
                        onClick={() => setAccountMenuOpen(false)}
                      >
                        <Settings size={18} />
                        <span>Settings</span>
                      </Link>

                      <hr className="my-2" />

                      <button
                        onClick={handleSignOut}
                        className="flex items-center space-x-2 px-4 py-2 hover:bg-red-50 text-red-600 w-full"
                      >
                        <LogOut size={18} />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link href="/buyer/auth">
                  <Button variant="primary" size="sm">
                    Sign In
                  </Button>
                </Link>
              )}
            </div>

            {/* Mobile Menu & Search Icons */}
            <div className="flex md:hidden items-center space-x-3">
              <button
                onClick={toggleMobileSearch}
                className="mobile-icon-button"
                aria-label="Open Search"
              >
                <Search size={24} />
              </button>
              <button
                onClick={toggleMobileMenu}
                className="mobile-icon-button"
                aria-label="Toggle Menu"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* Mobile Menu Overlay */}
      <div
        className={`mobile-menu-overlay ${mobileMenuOpen ? 'mobile-menu-open' : ''}`}
        onClick={toggleMobileMenu}
      >
        <div
          className={`mobile-menu-panel ${mobileMenuOpen ? 'mobile-menu-panel-open' : ''}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mobile-menu-header">
            <div className="flex items-center space-x-2">
              <Car className="text-accent-blue" size={28} />
              <span className="text-xl font-bold text-white">
                JustCars<span className="text-accent-blue">.ng</span>
              </span>
            </div>
            <button onClick={toggleMobileMenu} className="mobile-close-button">
              <X size={24} />
            </button>
          </div>

          <nav className="mobile-menu-nav">
            {navLinks.map((link, index) => (
              <Link
                key={link.href}
                href={link.href}
                className="mobile-nav-link"
                onClick={toggleMobileMenu}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="mobile-menu-footer">
            {isAuthenticated ? (
              <div className="space-y-2">
                <div className="px-4 py-3 bg-white/10 rounded-lg mb-3">
                  <p className="text-xs text-white/70">Signed in as</p>
                  <p className="text-sm font-medium text-white truncate">{user?.email}</p>
                </div>

                <Link href="/buyer/saved" onClick={toggleMobileMenu}>
                  <button className="w-full flex items-center space-x-2 px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all">
                    <Heart size={18} />
                    <span>Saved Cars</span>
                  </button>
                </Link>

                <Link href="/buyer/chats" onClick={toggleMobileMenu}>
                  <button className="w-full flex items-center space-x-2 px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all">
                    <MessageCircle size={18} />
                    <span>My Chats</span>
                  </button>
                </Link>

                <button
                  onClick={() => {
                    handleSignOut()
                    toggleMobileMenu()
                  }}
                  className="w-full flex items-center space-x-2 px-4 py-3 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-200 transition-all"
                >
                  <LogOut size={18} />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <Link href="/buyer/auth" onClick={toggleMobileMenu}>
                <Button variant="primary" size="md" className="w-full">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Search Overlay */}
      <div className={`mobile-search-overlay ${mobileSearchOpen ? 'mobile-search-open' : ''}`}>
        <div className="mobile-search-header">
          <h2 className="text-xl font-bold text-white">Search Cars</h2>
          <button onClick={toggleMobileSearch} className="mobile-close-button">
            <X size={24} />
          </button>
        </div>

        <div className="mobile-search-content">
          <div className="search-input-group">
            <Search className="search-icon" size={20} />
            <input
              type="text"
              placeholder="Search by make, model, or keyword..."
              className="mobile-search-input"
              autoFocus
            />
          </div>

          <div className="quick-filters">
            <h3 className="quick-filter-title">Quick Filters</h3>
            <div className="quick-filter-grid">
              {['Toyota', 'Mercedes', 'BMW', 'Honda', 'Lexus', 'Ford'].map((make) => (
                <button key={make} className="quick-filter-pill">
                  {make}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
