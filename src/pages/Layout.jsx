

import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { TrendingUp, BarChart3, Trophy, Menu, X, Send, BookOpen, User as UserIcon, LogIn, DollarSign, LineChart, Activity, History, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet";
import MoneyFall from "../components/animations/MoneyFall";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/api/client";

const navigationItems = [
  { title: "Markets", url: createPageUrl("Markets"), icon: TrendingUp },
  { title: "Portfolio", url: createPageUrl("Portfolio"), icon: BarChart3 },
  { title: "Analytics", url: createPageUrl("PortfolioAnalytics"), icon: LineChart },
  { title: "Trade History", url: createPageUrl("TradeHistory"), icon: History },
  { title: "Request Market", url: createPageUrl("RequestMarket"), icon: Send },
  { title: "Leaderboard", url: createPageUrl("Leaderboard"), icon: Trophy },
  { title: "Learn More", url: createPageUrl("LearnMore"), icon: BookOpen },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [activePositions, setActivePositions] = useState(0);
  const [brunoDollars, setBrunoDollars] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      setIsLoadingUser(true);
      try {
        console.log('🔍 Attempting to fetch current user...');
        const currentUser = await User.me();
        console.log('✅ User authenticated:', currentUser.email);
        
        // Ensure user has their $100 bonus and is properly initialized
        try {
          console.log('💰 Ensuring user bonus and verification...');
          const bonusResponse = await ensureUserBonus({});
          console.log('✅ Bonus/verification response:', bonusResponse);
          
          // Give the system a moment to process the update
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (bonusError) {
          console.error('❌ Error ensuring bonus:', bonusError);
        }
        
        // Fetch user again to get FRESH updated balance and verification status
        try {
          console.log('📊 Fetching FRESH user data after bonus...');
          
          const users = await User.list();
          // Use .toLowerCase() for robust email comparison
          const updatedUser = users.find(u => u.email.toLowerCase() === currentUser.email.toLowerCase());
          
          if (updatedUser) {
            console.log('✅ Found updated user:', {
              email: updatedUser.email,
              bruno_dollars: updatedUser.bruno_dollars,
              role: updatedUser.role,
              is_verified: updatedUser.is_verified,
              can_trade: updatedUser.can_trade
            });
            setUser(updatedUser);
            setBrunoDollars(updatedUser.bruno_dollars || 100);
          } else {
            console.warn('⚠️ User not found in list, using current user data');
            setUser(currentUser);
            setBrunoDollars(100); // Default to 100 if user not found in list
          }
          
          // Fetch positions - ensure user_id comparison is consistent
          const positions = await Position.filter({ user_id: currentUser.email.toLowerCase() });
          const activeCount = positions.filter(p => p.shares > 0).length;
          setActivePositions(activeCount);
          console.log(`📈 Loaded ${activeCount} active positions`);
          
        } catch (dataError) {
          console.error('❌ Error fetching user data:', dataError);
          // Fallback to current user data if fetching from list fails
          setUser(currentUser);
          setBrunoDollars(100); // Default to 100
        }
        
      } catch (error) {
        console.log('❌ User not authenticated:', error.message);
        setUser(null);
        setBrunoDollars(0);
        setActivePositions(0);
      }
      setIsLoadingUser(false);
    };
    
    fetchUser();

    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [location.pathname]);

  const handleLogin = async () => {
    console.log('🔐 Initiating login...');
    try {
      await User.loginWithRedirect(window.location.href);
    } catch (error) {
      console.error('❌ Login error:', error);
      alert('Failed to initiate login. Please try again.');
    }
  };

  const handleLogout = async () => {
    console.log('👋 Logging out...');
    try {
      await User.logout();
      setUser(null);
      setBrunoDollars(0);
      setActivePositions(0);
    } catch (error) {
      console.error('❌ Logout error:', error);
    }
  };

  // Check if we're on the Markets homepage
  const isMarketsPage = location.pathname === createPageUrl("Markets");
  const isLearnMorePage = location.pathname === createPageUrl("LearnMore");

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FAF3E0] via-[#F5EED8] to-[#E8DCC8] relative">
      
      {/* Money Fall Animation - on Markets page */}
      {(isMarketsPage) && (
        <div className="fixed inset-0 z-[15] pointer-events-none">
          <MoneyFall duration={60000} /> {/* Added duration prop */}
        </div>
      )}
      
      {/* Floating Translucent Navbar */}
      <motion.header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled 
            ? 'bg-white/80 backdrop-blur-xl shadow-xl border-b border-[#A97142]/20' 
            : 'bg-white/60 backdrop-blur-md'
        }`}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to={createPageUrl("Markets")} className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-gradient-to-br from-[#A97142] to-[#CD853F] rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <img 
                  src="https://picsum.photos/seed/logo/100/100" 
                  alt="Bruno Exchange" 
                  className="w-6 h-6 object-contain"
                />
              </div>
              <span className="text-xl font-bold text-[#4E3629] hidden sm:block">Bruno Exchange</span>
            </Link>
            
            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-1">
              {navigationItems.map((item) => (
                <Link
                  key={item.title}
                  to={item.url}
                  className="relative px-4 py-2 text-sm font-medium text-[#4E3629] hover:text-[#A97142] transition-colors group"
                >
                  {item.title}
                  <span className={`absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-[#A97142] to-[#CD853F] transform origin-left transition-transform duration-300 ${
                    location.pathname === item.url ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                  }`} />
                </Link>
              ))}
              {/* Admin link removed from desktop navigation as per request */}
            </nav>

            {/* User Info / Login */}
            <div className="flex items-center gap-3">
              {isLoadingUser ? (
                 <div className="w-40 h-10 bg-[#4E3629]/10 rounded-full animate-pulse"></div>
              ) : user ? (
                <div className="hidden md:flex items-center gap-3 bg-gradient-to-r from-[#4E3629] to-[#6B5446] px-5 py-2.5 rounded-full border-2 border-[#A97142]/30 shadow-lg">
                  <div className="flex items-center gap-2 border-r border-white/20 pr-4">
                    <DollarSign className="w-5 h-5 text-[#50C878]" />
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={brunoDollars}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="text-base font-bold text-[#CD853F]"
                      >
                        {brunoDollars.toFixed(2)}
                      </motion.span>
                    </AnimatePresence>
                  </div>
                  <span className="text-xs text-white/80 max-w-[120px] truncate">{user.email}</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleLogout} 
                    className="text-white/60 hover:text-white hover:bg-white/10 p-1"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={handleLogin} 
                  className="hidden md:flex bg-gradient-to-r from-[#A97142] to-[#CD853F] text-white hover:from-[#8B5A3C] hover:to-[#A97142] shadow-lg px-6 rounded-full"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </Button>
              )}

              {/* Mobile Menu */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden text-[#4E3629]">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="bg-white border-l border-[#A97142]/20">
                  <SheetHeader className="pb-6 border-b border-[#4E3629]/10">
                    <SheetTitle className="flex items-center gap-3 text-xl text-[#4E3629]">
                      <img 
                        src="/logo.svg" 
                        alt="Bruno Exchange" 
                        className="w-10 h-10 object-contain" 
                      />
                      Bruno Exchange
                    </SheetTitle>
                  </SheetHeader>
                  
                  {user && (
                    <div className="mt-4 p-4 bg-gradient-to-r from-[#4E3629] to-[#6B5446] rounded-lg">
                      <p className="text-sm font-semibold text-white mb-2">{user.email}</p>
                      <div className="flex items-center gap-2 text-white">
                        <DollarSign className="w-5 h-5 text-[#50C878]" />
                        <span className="text-xl font-bold text-[#CD853F]">{brunoDollars.toFixed(2)}</span>
                        <span className="text-xs text-white/60 ml-1">Bruno Dollars</span>
                      </div>
                    </div>
                  )}
                  
                  <nav className="mt-8 space-y-2">
                    {navigationItems.map((item) => (
                      <Link 
                        key={item.title} 
                        to={item.url} 
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                          location.pathname === item.url 
                            ? 'bg-gradient-to-r from-[#A97142] to-[#CD853F] text-white shadow-lg' 
                            : 'text-[#4E3629] hover:bg-[#4E3629]/5'
                        }`}
                      >
                        <item.icon className="w-5 h-5" />
                        <span className="font-medium">{item.title}</span>
                      </Link>
                    ))}
                    {/* Admin link removed from mobile navigation as per request */}
                  </nav>

                  <div className="mt-8 pt-8 border-t border-[#4E3629]/10">
                    {user ? (
                        <Button 
                          variant="outline" 
                          className="w-full border-[#E34234] text-[#E34234] hover:bg-[#E34234]/10" 
                          onClick={handleLogout}
                        >
                          Sign Out
                        </Button>
                    ) : (
                        <Button 
                          onClick={handleLogin} 
                          className="w-full bg-gradient-to-r from-[#A97142] to-[#CD853F] text-white"
                        >
                          <LogIn className="w-4 h-4 mr-2" />
                          Sign In
                        </Button>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content with top padding for fixed navbar */}
      <main className="relative z-10 pt-16">
        {React.cloneElement(children, { user })}

        {/* Discreet Admin Button on Learn More page for Admins */}
        {user?.role === 'admin' && isLearnMorePage && (
          <motion.div 
            className="fixed bottom-8 right-8 z-20"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 2, duration: 0.5 }}
          >
            <Link to={createPageUrl("Admin")}>
              <Button
                variant="ghost"
                size="sm"
                className="bg-[#4E3629]/10 hover:bg-[#4E3629]/20 text-[#4E3629] text-xs backdrop-blur-sm"
              >
                Admin
              </Button>
            </Link>
          </motion.div>
        )}
      </main>
      
      {/* Footer */}
      <footer className="bg-[#4E3629] border-t-2 border-[#A97142]/30 mt-24 relative z-10 overflow-hidden">
        {/* Bear Watermark */}
        <div className="absolute bottom-0 right-0 w-96 h-96 opacity-[0.03] pointer-events-none">
          <img 
            src="/bonus-coin.svg"
            alt="Bruno Bear"
            className="w-full h-full object-contain"
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="text-[#FAF3E0] font-bold mb-4">Markets</h4>
              <ul className="space-y-2 text-[#FAF3E0]/70 text-sm">
                <li><Link to={createPageUrl("Markets")} className="hover:text-[#A97142] transition">Browse All</Link></li>
                <li><Link to={createPageUrl("AllMarkets")} className="hover:text-[#A97142] transition">All Markets</Link></li>
                <li><Link to={createPageUrl("RequestMarket")} className="hover:text-[#A97142] transition">Request Market</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[#FAF3E0] font-bold mb-4">Trading</h4>
              <ul className="space-y-2 text-[#FAF3E0]/70 text-sm">
                <li><Link to={createPageUrl("Portfolio")} className="hover:text-[#A97142] transition">Portfolio</Link></li>
                <li><Link to={createPageUrl("Leaderboard")} className="hover:text-[#A97142] transition">Leaderboard</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[#FAF3E0] font-bold mb-4">Learn</h4>
              <ul className="space-y-2 text-[#FAF3E0]/70 text-sm">
                <li><Link to={createPageUrl("LearnMore")} className="hover:text-[#A97142] transition">How It Works</Link></li>
                <li><a href="#" className="hover:text-[#A97142] transition">Terms</a></li>
                <li><a href="#" className="hover:text-[#A97142] transition">Privacy</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[#FAF3E0] font-bold mb-4">About</h4>
              <p className="text-[#FAF3E0]/70 text-sm mb-4">
                Brown University's prediction market platform for campus events. Educational use only.
              </p>
              <div className="w-16 h-16 opacity-30">
                <img 
                  src="https://picsum.photos/seed/logo/100/100"
                  alt="Brown Crest"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-[#FAF3E0]/10 text-center">
            <p className="text-sm text-[#FAF3E0]/50">
              © 2025 Bruno Exchange. Built for Brown University students. Educational use only.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

