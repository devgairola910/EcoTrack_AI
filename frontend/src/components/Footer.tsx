import React from "react";
import { Leaf, Globe, Shield, MessageSquare } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-dark-950 border-t border-white/5 py-12 mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Logo & Description */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center space-x-2 text-brand-400">
              <Leaf className="h-6 w-6" />
              <span className="font-semibold text-lg text-white font-display">
                EcoTrack<span className="text-brand-500 font-bold">AI</span>
              </span>
            </div>
            <p className="text-sm text-dark-400 max-w-sm">
              An AI-powered environmental analytics suite helping individuals and households understand, simulate, and optimize their carbon footprint with science-backed solutions.
            </p>
          </div>

          {/* Platform Info */}
          <div>
            <h4 className="text-sm font-semibold text-white tracking-wider uppercase mb-4">Science & Data</h4>
            <ul className="space-y-2 text-sm text-dark-400">
              <li className="flex items-center space-x-2">
                <Globe className="h-4 w-4 text-brand-500/60" />
                <span>IPCC standard factors</span>
              </li>
              <li className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-brand-500/60" />
                <span>EPA-certified modeling</span>
              </li>
            </ul>
          </div>

          {/* Quick Contact */}
          <div>
            <h4 className="text-sm font-semibold text-white tracking-wider uppercase mb-4">Support</h4>
            <ul className="space-y-2 text-sm text-dark-400">
              <li className="flex items-center space-x-2">
                <MessageSquare className="h-4 w-4 text-brand-500/60" />
                <span>Feedback & Ideas</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between">
          <p className="text-xs text-dark-500">
            &copy; {new Date().getFullYear()} EcoTrack AI. All rights reserved. Built for carbon reduction awareness.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0 text-xs text-dark-500">
            <span className="hover:text-brand-400 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-brand-400 cursor-pointer">Terms of Service</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
