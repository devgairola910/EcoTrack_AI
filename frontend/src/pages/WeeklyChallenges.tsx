import React, { useState, useEffect } from "react";
import { 
  Award, CheckCircle, Clock, Play, ArrowRight,
  TrendingDown, ShieldAlert, Sparkles, RefreshCw
} from "lucide-react";
import { useEco } from "../context/EcoContext";
import { api } from "../services/api";
import type { ChallengeResponse } from "../services/api";
import confetti from "canvas-confetti";

interface WeeklyChallengesProps {
  setCurrentPage: (page: string) => void;
}

export const WeeklyChallenges: React.FC<WeeklyChallengesProps> = () => {
  const { token } = useEco();
  const [challenges, setChallenges] = useState<ChallengeResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // Load challenges
  const loadChallenges = async () => {
    setLoading(true);
    try {
      const activeToken = token || "local_fallback_token";
      const fetched = await api.fetchChallenges(activeToken);
      setChallenges(fetched);
      setIsOfflineMode(!token);
    } catch (err) {
      console.warn("Failed to fetch challenges, loading local fallback:", err);
      setIsOfflineMode(true);
      const cached = localStorage.getItem("ecotrack_challenges");
      if (cached) {
        setChallenges(JSON.parse(cached));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChallenges();
  }, [token]);

  // Update challenge status
  const handleUpdateStatus = async (challengeId: string, newStatus: string) => {
    try {
      const activeToken = token || "local_fallback_token";
      await api.updateChallengeStatus(activeToken, challengeId, newStatus);
      
      // Update state locally
      setChallenges(prev => 
        prev.map(c => {
          if (c.challenge_id === challengeId) {
            const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
            return {
              ...c,
              status: newStatus,
              start_date: newStatus === "active" ? today : c.start_date,
              completed_date: newStatus === "completed" ? today : c.completed_date
            };
          }
          return c;
        })
      );

      if (newStatus === "completed") {
        // Trigger a massive confetti explosion!
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.7 },
          colors: ["#10b981", "#3b82f6", "#f59e0b", "#14b8a6"]
        });
      }
    } catch (err) {
      console.error("Failed to update challenge status:", err);
    }
  };

  // Reset challenges
  const handleReset = async () => {
    if (window.confirm("Are you sure you want to reset all challenge progression?")) {
      try {
        const activeToken = token || "local_fallback_token";
        await api.clearChallenges(activeToken);
        loadChallenges();
      } catch (err) {
        console.error("Failed to clear challenges:", err);
      }
    }
  };

  // Compute challenge stats
  const activeCount = challenges.filter(c => c.status === "active").length;
  const completedCount = challenges.filter(c => c.status === "completed").length;
  const availableCount = challenges.filter(c => c.status === "available").length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-bold uppercase">Completed</span>;
      case "active":
        return <span className="text-[10px] px-2 py-0.5 bg-brand-500/10 text-brand-400 border border-brand-500/20 rounded-full font-bold uppercase flex items-center"><Clock className="h-3 w-3 mr-1 animate-spin" /> In Progress</span>;
      default:
        return <span className="text-[10px] px-2 py-0.5 bg-dark-900 border border-white/10 text-dark-300 rounded-full font-bold uppercase">Available</span>;
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 bg-gradient-glow min-h-[85vh]">
      
      {/* Header and status alerts */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Weekly Eco Challenges</h1>
          <p className="text-sm text-dark-400 mt-1">
            Commit to larger weekly sustainability goals and accelerate your environmental impact.
          </p>
        </div>

        <div className="flex items-center space-x-3 mt-4 md:mt-0">
          {isOfflineMode && (
            <div className="flex items-center space-x-1.5 text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl px-3.5 py-1.5">
              <ShieldAlert className="h-4 w-4" />
              <span>Offline Fallback</span>
            </div>
          )}
          {challenges.length > 0 && (
            <button 
              onClick={handleReset}
              className="text-xxs text-rose-400 hover:text-rose-300 bg-rose-500/10 px-3 py-1.5 border border-rose-500/20 rounded-xl transition hover:underline"
            >
              Reset Progress
            </button>
          )}
        </div>
      </div>

      {/* Challenges Tracker Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        
        {/* Available Challenges */}
        <div className="glass-panel rounded-2xl p-5 border border-white/5 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-dark-400 font-bold uppercase tracking-wider block">Available Tasks</span>
            <span className="text-3xl font-extrabold text-white mt-1 block">{availableCount}</span>
          </div>
          <div className="h-10 w-10 bg-dark-900 border border-white/10 rounded-xl flex items-center justify-center text-dark-300">
            <ArrowRight className="h-5 w-5" />
          </div>
        </div>

        {/* Accepted / In Progress */}
        <div className="glass-panel rounded-2xl p-5 border border-white/5 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-dark-400 font-bold uppercase tracking-wider block">Active Commits</span>
            <span className="text-3xl font-extrabold text-brand-400 mt-1 block">{activeCount}</span>
          </div>
          <div className="h-10 w-10 bg-brand-500/10 border border-brand-500/20 rounded-xl flex items-center justify-center text-brand-400">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        {/* Completed Challenges */}
        <div className="glass-panel rounded-2xl p-5 border border-white/5 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-dark-400 font-bold uppercase tracking-wider block">Completed Goals</span>
            <span className="text-3xl font-extrabold text-emerald-400 mt-1 block">{completedCount}</span>
          </div>
          <div className="h-10 w-10 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400">
            <CheckCircle className="h-5 w-5 animate-pulse-slow" />
          </div>
        </div>

      </div>

      {/* Challenges list grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 text-dark-400 space-y-3">
          <RefreshCw className="h-8 w-8 animate-spin text-brand-400" />
          <span className="text-sm">Seeding weekly tasks...</span>
        </div>
      ) : challenges.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {challenges.map(c => {
            const isAvailable = c.status === "available";
            const isActive = c.status === "active";
            const isCompleted = c.status === "completed";

            return (
              <div 
                key={c.id} 
                className={`glass-panel rounded-3xl p-6 border flex flex-col justify-between h-[300px] transition-all duration-300 relative overflow-hidden ${
                  isCompleted 
                    ? "border-emerald-500/30 bg-emerald-500/[0.01]" 
                    : isActive 
                    ? "border-brand-500/30 bg-brand-500/[0.01]" 
                    : "border-white/5 hover:border-white/10"
                }`}
              >
                {/* Visual completion accent */}
                {isCompleted && (
                  <div className="absolute top-0 right-0 h-16 w-16 bg-gradient-to-bl from-emerald-500/20 to-transparent pointer-events-none rounded-bl-full flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-emerald-400 ml-4 mb-4" />
                  </div>
                )}

                {/* Challenge Information */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    {getStatusBadge(c.status)}
                    <span className="text-brand-400 font-bold text-sm tracking-wide flex items-center">
                      <TrendingDown className="h-4 w-4 mr-1 text-brand-400" />
                      -{c.co2_saved} kg CO₂
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center">
                      {c.title}
                    </h3>
                    <p className="text-xs text-dark-300 mt-2 leading-relaxed h-[65px] overflow-hidden">
                      {c.description}
                    </p>
                  </div>
                </div>

                {/* Dates (if active/completed) */}
                {(isActive || isCompleted) && (
                  <div className="text-[10px] text-dark-400 bg-white/5 py-1.5 px-3 rounded-lg flex justify-between">
                    <span>Started: <strong className="text-dark-200">{c.start_date || "Today"}</strong></span>
                    {isCompleted && (
                      <span>Completed: <strong className="text-emerald-400">{c.completed_date || "Today"}</strong></span>
                    )}
                  </div>
                )}

                {/* Action Controls */}
                <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    <Award className="h-4 w-4 text-brand-400" />
                    <span className="text-xs font-bold text-dark-300">+{c.points} Eco Points</span>
                  </div>

                  {isAvailable && (
                    <button
                      onClick={() => handleUpdateStatus(c.challenge_id, "active")}
                      className="flex items-center space-x-1 bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition duration-200 shadow shadow-brand-600/20"
                    >
                      <Play className="h-3 w-3 fill-current" />
                      <span>Accept Challenge</span>
                    </button>
                  )}

                  {isActive && (
                    <button
                      onClick={() => handleUpdateStatus(c.challenge_id, "completed")}
                      className="flex items-center space-x-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition duration-200 shadow shadow-emerald-600/20"
                    >
                      <CheckCircle className="h-3 w-3" />
                      <span>Mark Complete</span>
                    </button>
                  )}

                  {isCompleted && (
                    <button
                      disabled
                      className="flex items-center space-x-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs px-4 py-2.5 rounded-xl cursor-not-allowed"
                    >
                      <CheckCircle className="h-3 w-3" />
                      <span>Goal Achieved</span>
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 bg-dark-900 border border-white/5 rounded-3xl">
          <p className="text-sm text-dark-400">Weekly challenges will refresh soon.</p>
        </div>
      )}

    </div>
  );
};
