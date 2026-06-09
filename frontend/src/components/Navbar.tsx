import React, { useState } from "react";
import { Leaf, Menu, X, Award } from "lucide-react";
import { useEco } from "../context/EcoContext";

interface NavbarProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPage, setCurrentPage }) => {
  const { isCalculated, assessmentResult } = useEco();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: "landing", label: "Home" },
    { id: "calculator", label: "Carbon Calculator" },
    { id: "dashboard", label: "Dashboard", disabled: !isCalculated },
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

          {/* User Score Badge or Assessment Pending */}
          <div className="hidden md:flex items-center space-x-4">
            {isCalculated && assessmentResult ? (
              <div 
                onClick={() => setCurrentPage("dashboard")}
                className="flex items-center space-x-2 cursor-pointer bg-dark-900 border border-brand-500/20 hover:border-brand-500/40 rounded-full px-4 py-1.5 transition-all duration-300"
              >
                <Award className="h-4 w-4 text-brand-400" />
                <span className="text-xs text-dark-300">Eco Score:</span>
                <span className="text-sm font-bold text-brand-400">{assessmentResult.eco_score}</span>
              </div>
            ) : (
              <button
                onClick={() => setCurrentPage("calculator")}
                className="bg-brand-600 hover:bg-brand-500 text-white px-5 py-2 rounded-xl text-xs font-semibold tracking-wide shadow-lg shadow-brand-600/25 transition-all duration-300 hover:scale-[1.02]"
              >
                Start Assessment
              </button>
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
          {!isCalculated && (
            <div className="pt-2 px-4">
              <button
                onClick={() => handleNavClick("calculator")}
                className="w-full bg-brand-600 hover:bg-brand-500 text-white py-3 rounded-xl text-center text-sm font-bold shadow-lg shadow-brand-600/20"
              >
                Start Carbon Assessment
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};
