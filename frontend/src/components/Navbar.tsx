import React, { useState } from "react";
import { Leaf, Menu, X, Award, LogOut } from "lucide-react";
import { useEco } from "../context/EcoContext";

interface NavbarProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  onOpenAuth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPage, setCurrentPage, onOpenAuth }) => {
  const { isCalculated, assessmentResult, user, logout } = useEco();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: "landing", label: "Home" },
    { id: "calculator", label: "Carbon Calculator" },
    { id: "dashboard", label: "Dashboard", disabled: !isCalculated },
    { id: "tracker", label: "Activity Tracker", disabled: !isCalculated },
    { id: "challenges", label: "Weekly Challenges", disabled: !isCalculated },
    { id: "chat", label: "AI Coach", disabled: !isCalculated },
    { id: "simulator", label: "Simulator", disabled: !isCalculated },
    { id: "recommendations", label: "Action recommendations", disabled: !isCalculated }
  ];

  const handleNavClick = (pageId: string, disabled?: boolean) => {
    if (disabled) return;
    setCurrentPage(pageId);
    setMobileMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 w-full glass-panel border-b border-white/5 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div 
            className="flex cursor-pointer items-center space-x-2 text-brand-400"
            onClick={() => setCurrentPage("landing")}
          >
            <Leaf className="h-7 w-7 animate-pulse-slow" />
            <span className="font-semibold text-xl tracking-tight text-white font-display">
              EcoTrack<span className="text-brand-500 font-extrabold">AI</span>
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id, item.disabled)}
                disabled={item.disabled}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                  currentPage === item.id
                    ? "bg-brand-500/10 text-brand-400 border border-brand-500/20"
                    : item.disabled
                    ? "text-dark-500 cursor-not-allowed opacity-50"
                    : "text-dark-300 hover:text-white hover:bg-white/5"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Desktop User Section */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-3 animate-fade-in">
                {isCalculated && assessmentResult && (
                  <div 
                    onClick={() => setCurrentPage("dashboard")}
                    className="flex items-center space-x-1.5 cursor-pointer bg-dark-900 border border-brand-500/20 hover:border-brand-500/40 rounded-full px-3 py-1.5 transition-all duration-300"
                  >
                    <Award className="h-4 w-4 text-brand-400" />
                    <span className="text-xs text-dark-300">Score:</span>
                    <span className="text-sm font-bold text-brand-400">{assessmentResult.eco_score}</span>
                  </div>
                )}
                <div className="text-xs text-dark-300 bg-white/5 border border-white/10 rounded-xl px-4 py-2">
                  Hi, <span className="font-semibold text-white">{user.name.split(" ")[0]}</span>
                </div>
                <button
                  onClick={logout}
                  className="p-2 rounded-xl text-dark-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                  title="Log Out"
                >
                  <LogOut className="h-4.5 w-4.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <button
                  onClick={onOpenAuth}
                  className="text-dark-300 hover:text-white text-xs font-bold px-4.5 py-2.5 border border-white/10 rounded-xl hover:bg-white/5 transition duration-300"
                >
                  Sign In
                </button>
                <button
                  onClick={() => setCurrentPage("calculator")}
                  className="bg-brand-600 hover:bg-brand-500 text-white px-5 py-2.5 rounded-xl text-xs font-semibold tracking-wide shadow-lg shadow-brand-600/25 transition-all duration-300 hover:scale-[1.02]"
                >
                  Assessment
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-dark-300 hover:text-white focus:outline-none"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden glass-panel border-t border-white/5 px-2 pt-2 pb-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id, item.disabled)}
              disabled={item.disabled}
              className={`block w-full text-left px-4 py-3 rounded-xl text-base font-medium ${
                currentPage === item.id
                  ? "bg-brand-500/10 text-brand-400"
                  : item.disabled
                  ? "text-dark-600 cursor-not-allowed opacity-50"
                  : "text-dark-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
          
          <div className="pt-4 border-t border-white/5 px-4 space-y-2">
            {user ? (
              <div className="flex items-center justify-between">
                <span className="text-sm text-dark-300">
                  Logged in as <strong className="text-white">{user.name}</strong>
                </span>
                <button
                  onClick={() => { logout(); setMobileMenuOpen(false); }}
                  className="flex items-center space-x-1 text-xs text-rose-400 font-bold"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Log Out</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { onOpenAuth(); setMobileMenuOpen(false); }}
                  className="w-full text-center border border-white/10 hover:bg-white/5 text-white py-2.5 rounded-xl text-sm font-bold"
                >
                  Sign In
                </button>
                <button
                  onClick={() => { setCurrentPage("calculator"); setMobileMenuOpen(false); }}
                  className="w-full bg-brand-600 hover:bg-brand-500 text-white py-2.5 rounded-xl text-center text-sm font-bold shadow"
                >
                  Assessment
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
