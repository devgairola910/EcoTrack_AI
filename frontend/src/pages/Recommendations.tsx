import React, { useState } from "react";
import { 
  Check, Plus, Info, Filter,
  Leaf, Zap, Apple, ShoppingBag, Award
} from "lucide-react";
import { useEco } from "../context/EcoContext";
import confetti from "canvas-confetti";

interface RecommendationsProps {
  setCurrentPage: (page: string) => void;
}

export const Recommendations: React.FC<RecommendationsProps> = ({ setCurrentPage }) => {
  const { recommendations, adoptedRecommendations, toggleRecommendation, assessmentResult } = useEco();
  const [activeTab, setActiveTab] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("saving"); // "saving" | "difficulty"

  if (!assessmentResult || recommendations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-4">
        <Info className="h-12 w-12 text-yellow-400" />
        <h2 className="text-xl font-bold text-white">No Recommendations Available</h2>
        <p className="text-sm text-dark-400">Please complete the Carbon Calculator assessment to generate your personalized action plan.</p>
        <button
          onClick={() => setCurrentPage("calculator")}
          className="bg-brand-600 hover:bg-brand-500 text-white px-6 py-2.5 rounded-xl font-semibold transition"
        >
          Go to Calculator
        </button>
      </div>
    );
  }

  // Handle adopting action with confetti explosion!
  const handleAdoptToggle = (id: string, isCurrentlyAdopted: boolean) => {
    toggleRecommendation(id);
    
    if (!isCurrentlyAdopted) {
      // Trigger a beautiful, elegant green/emerald confetti splash!
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.8 },
        colors: ["#10b981", "#34d399", "#6ee7b7", "#059669"]
      });
    }
  };

  // Filter recommendations
  const filteredRecs = recommendations.filter((rec) => {
    if (activeTab === "all") return true;
    return rec.category.toLowerCase() === activeTab.toLowerCase();
  });

  // Sort recommendations
  const sortedRecs = [...filteredRecs].sort((a, b) => {
    if (sortBy === "saving") {
      return b.annual_saving_kg - a.annual_saving_kg;
    } else {
      // difficulty ranking: easy -> medium -> hard
      const rank: Record<string, number> = { easy: 1, medium: 2, hard: 3 };
      return rank[a.difficulty] - rank[b.difficulty];
    }
  });

  // Category Icons
  const categoryIcons: Record<string, React.ReactNode> = {
    transport: <Leaf className="h-4 w-4 text-amber-400" />,
    energy: <Zap className="h-4 w-4 text-orange-400" />,
    diet: <Apple className="h-4 w-4 text-emerald-400" />,
    consumption: <ShoppingBag className="h-4 w-4 text-purple-400" />
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff.toLowerCase()) {
      case "easy": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "medium": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "hard": return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      default: return "bg-dark-900 text-dark-400";
    }
  };

  const getCostColor = (cost: string) => {
    switch (cost.toLowerCase()) {
      case "low": return "text-emerald-400";
      case "medium": return "text-amber-400";
      case "high": return "text-rose-400";
      default: return "text-dark-400";
    }
  };

  // Calculate sum of adopted carbon savings
  const adoptedSavings = recommendations
    .filter((r) => adoptedRecommendations.includes(r.id))
    .reduce((sum, r) => sum + r.annual_saving_kg, 0);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 bg-gradient-glow min-h-[85vh]">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Action recommendations</h1>
          <p className="text-sm text-dark-400 mt-1">
            Personalized environmental adjustments based on your highest emission channels.
          </p>
        </div>

        {/* Adopted Stats Widget */}
        {adoptedRecommendations.length > 0 && (
          <div className="glass-panel border-brand-500/20 rounded-2xl py-2 px-4 flex items-center space-x-3 mt-4 md:mt-0">
            <Award className="h-5 w-5 text-brand-400 animate-pulse-slow" />
            <div>
              <span className="text-[10px] text-dark-400 font-semibold block uppercase">Simulated Savings</span>
              <span className="text-sm font-bold text-brand-400">{Math.round(adoptedSavings)} kg CO2e / yr</span>
            </div>
            <span className="text-xxs px-2 py-0.5 bg-brand-500/10 text-brand-400 border border-brand-500/20 rounded-md">
              {adoptedRecommendations.length} active
            </span>
          </div>
        )}
      </div>

      {/* Tabs and Sorters Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: "all", label: "All Items" },
            { id: "transport", label: "Transport" },
            { id: "energy", label: "Energy" },
            { id: "diet", label: "Diet & Food" },
            { id: "consumption", label: "Consumption" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                activeTab === tab.id
                  ? "bg-brand-500/10 border-brand-500 text-brand-400"
                  : "bg-dark-900/40 border-white/5 text-dark-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Sorters */}
        <div className="flex items-center space-x-3 text-xs">
          <span className="text-dark-500 flex items-center">
            <Filter className="h-3.5 w-3.5 mr-1" />
            Sort By:
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-dark-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-dark-200 outline-none focus:border-brand-500 transition"
          >
            <option value="saving">Carbon Savings</option>
            <option value="difficulty">Ease of Adoption</option>
          </select>
        </div>
      </div>

      {/* Recommendations Cards Grid */}
      {sortedRecs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedRecs.map((rec) => {
            const isAdopted = adoptedRecommendations.includes(rec.id);
            return (
              <div 
                key={rec.id} 
                className={`glass-panel rounded-2xl p-5 border flex flex-col justify-between h-[280px] transition-all duration-300 ${
                  isAdopted ? "border-brand-500/40 bg-brand-500/[0.02]" : "border-white/5"
                }`}
              >
                {/* Upper info */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center space-x-1.5 text-[10px] font-bold text-dark-400 uppercase tracking-wider">
                      {categoryIcons[rec.category.toLowerCase()]}
                      <span>{rec.category}</span>
                    </span>
                    <span className="text-brand-400 font-extrabold text-sm font-display">
                      -{Math.round(rec.annual_saving_kg)} kg
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white leading-tight">{rec.title}</h3>
                  <p className="text-xs text-dark-300 leading-relaxed overflow-hidden line-clamp-3">
                    {rec.description}
                  </p>
                </div>

                {/* Bottom tags & Adopt action */}
                <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                  <div className="flex space-x-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded border capitalize ${getDifficultyColor(rec.difficulty)}`}>
                      {rec.difficulty}
                    </span>
                    <span className="text-[10px] text-dark-400 py-0.5">
                      Cost: <strong className={getCostColor(rec.cost)}>{rec.cost}</strong>
                    </span>
                  </div>

                  <button
                    onClick={() => handleAdoptToggle(rec.id, isAdopted)}
                    className={`flex items-center space-x-1 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${
                      isAdopted
                        ? "bg-brand-500/20 text-brand-400 border border-brand-500/30"
                        : "bg-brand-600 hover:bg-brand-500 text-white shadow shadow-brand-600/20"
                    }`}
                  >
                    {isAdopted ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>Adopted</span>
                      </>
                    ) : (
                      <>
                        <Plus className="h-3.5 w-3.5" />
                        <span>Adopt Action</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 bg-dark-900 border border-white/5 rounded-3xl">
          <p className="text-sm text-dark-400">No actions found matching this category filter.</p>
        </div>
      )}
    </div>
  );
};
