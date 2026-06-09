import React, { useState, useEffect } from "react";
import { 
  Flame, Award, Trash2, Calendar, Plus, 
  Bike, Soup, Bus, ShowerHead, ShoppingBag, Trash,
  AlertTriangle, RefreshCw
} from "lucide-react";
import { useEco } from "../context/EcoContext";
import { api } from "../services/api";
import type { ActivityResponse, ActivityLogRequest } from "../services/api";
import confetti from "canvas-confetti";

interface ActivityTrackerProps {
  setCurrentPage: (page: string) => void;
}

export const ActivityTracker: React.FC<ActivityTrackerProps> = () => {
  const { token } = useEco();
  const [activities, setActivities] = useState<ActivityResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [totalCO2Saved, setTotalCO2Saved] = useState(0);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // Predefined Eco-Actions
  const PREDEFINED_ACTIONS = [
    {
      id: "bike_commute",
      title: "Commute by Bike/Foot",
      description: "Walked or cycled instead of driving a fossil-fueled vehicle.",
      points: 15,
      co2_saved: 2.4,
      icon: <Bike className="h-6 w-6 text-emerald-400" />,
      category: "Transport"
    },
    {
      id: "plant_meals",
      title: "Ate Plant-Based Meals",
      description: "Ate vegetarian or vegan meals for the entire day.",
      points: 12,
      co2_saved: 1.9,
      icon: <Soup className="h-6 w-6 text-green-400" />,
      category: "Diet"
    },
    {
      id: "public_transit",
      title: "Used Public Transit",
      description: "Took a bus, train, or subway instead of driving a personal vehicle.",
      points: 10,
      co2_saved: 1.5,
      icon: <Bus className="h-6 w-6 text-amber-400" />,
      category: "Transport"
    },
    {
      id: "short_shower",
      title: "Short Shower (<5 mins)",
      description: "Saved water and heating energy by keeping the shower under 5 minutes.",
      points: 8,
      co2_saved: 0.5,
      icon: <ShowerHead className="h-6 w-6 text-cyan-400" />,
      category: "Energy"
    },
    {
      id: "no_plastic",
      title: "Avoided Single-Use Plastic",
      description: "Brought reusable bags, bottles, or container utensils.",
      points: 5,
      co2_saved: 0.2,
      icon: <ShoppingBag className="h-6 w-6 text-purple-400" />,
      category: "Consumption"
    },
    {
      id: "composting",
      title: "Composted Organic Waste",
      description: "Composted food remnants instead of sending them to landfill.",
      points: 6,
      co2_saved: 0.4,
      icon: <Trash className="h-6 w-6 text-yellow-500" />,
      category: "Waste"
    }
  ];

  // Fetch activities from backend (with fallback)
  const loadData = async () => {
    setLoading(true);
    try {
      const activeToken = token || "local_fallback_token";
      const fetched = await api.fetchActivities(activeToken);
      setActivities(fetched);
      setIsOfflineMode(!token);
    } catch (err) {
      console.warn("Failed to fetch activities, running locally:", err);
      setIsOfflineMode(true);
      const cached = localStorage.getItem("ecotrack_activities");
      if (cached) setActivities(JSON.parse(cached));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  // Recalculate stats when activities array updates
  useEffect(() => {
    // 1. Total points and CO2 saved
    const pts = activities.reduce((sum, act) => sum + act.points, 0);
    const co2 = activities.reduce((sum, act) => sum + act.co2_saved, 0);
    setTotalPoints(pts);
    setTotalCO2Saved(Number(co2.toFixed(1)));

    // 2. Streaks calculation
    calculateStreaks(activities);
  }, [activities]);

  const calculateStreaks = (actList: ActivityResponse[]) => {
    if (actList.length === 0) {
      setStreak(0);
      return;
    }

    // Get list of unique dates in YYYY-MM-DD
    const uniqueDates = Array.from(
      new Set(
        actList.map(act => {
          // Parse date or fallback to ISO format
          try {
            const dateObj = new Date(act.date);
            return dateObj.toISOString().split("T")[0];
          } catch {
            return act.date.split(",")[0]; // handle formatted strings
          }
        })
      )
    ).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()); // descending (newest first)

    if (uniqueDates.length === 0) {
      setStreak(0);
      return;
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const yesterdayObj = new Date();
    yesterdayObj.setDate(yesterdayObj.getDate() - 1);
    const yesterdayStr = yesterdayObj.toISOString().split("T")[0];

    const newestDate = uniqueDates[0];

    // If latest activity is older than yesterday, the streak is broken
    if (newestDate !== todayStr && newestDate !== yesterdayStr) {
      setStreak(0);
      return;
    }

    let currentStreak = 1;
    let expectedDate = new Date(newestDate);

    for (let i = 1; i < uniqueDates.length; i++) {
      expectedDate.setDate(expectedDate.getDate() - 1);
      const expectedStr = expectedDate.toISOString().split("T")[0];
      
      if (uniqueDates[i] === expectedStr) {
        currentStreak++;
      } else {
        break; // Streak interrupted
      }
    }

    setStreak(currentStreak);
  };

  // Log a new activity
  const handleLogActivity = async (action: typeof PREDEFINED_ACTIONS[0]) => {
    try {
      const todayStr = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric"
      });

      const entry: ActivityLogRequest = {
        action_id: action.id,
        points: action.points,
        co2_saved: action.co2_saved,
        date: todayStr
      };

      const activeToken = token || "local_fallback_token";
      const result = await api.logActivity(activeToken, entry);
      
      if (result.status === "success") {
        // Trigger confetti!
        confetti({
          particleCount: 60,
          spread: 40,
          origin: { y: 0.8 },
          colors: ["#10b981", "#4ade80", "#34d399", "#a7f3d0"]
        });

        // Prepend to state list
        const loggedId = result.activity_id || Date.now();
        setActivities(prev => [
          {
            id: loggedId,
            date: todayStr,
            action_id: action.id,
            points: action.points,
            co2_saved: action.co2_saved
          },
          ...prev
        ]);
      }
    } catch (err) {
      console.error("Failed to log activity:", err);
    }
  };

  // Delete a specific logged activity
  const handleDeleteActivity = async (id: number) => {
    try {
      const activeToken = token || "local_fallback_token";
      await api.deleteActivity(activeToken, id);
      setActivities(prev => prev.filter(act => act.id !== id));
    } catch (err) {
      console.error("Failed to delete activity:", err);
    }
  };

  // Clear all activity logs
  const handleClearAll = async () => {
    if (window.confirm("Are you sure you want to clear your daily activity logs? This will reset your points and streak.")) {
      try {
        const activeToken = token || "local_fallback_token";
        await api.clearActivities(activeToken);
        setActivities([]);
      } catch (err) {
        console.error("Failed to clear activities:", err);
      }
    }
  };

  // Gamer level configuration (100 points per level)
  const playerLevel = Math.max(1, Math.floor(totalPoints / 100) + 1);
  const nextLevelProgress = totalPoints % 100;
  const levelTitle = 
    playerLevel >= 5 ? "Carbon Overlord" : 
    playerLevel >= 4 ? "Eco Sentinel" : 
    playerLevel >= 3 ? "Green Champion" : 
    playerLevel >= 2 ? "Earth Ally" : "Eco Novice";

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 bg-gradient-glow min-h-[85vh]">
      
      {/* Header and Sync alerts */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center space-x-2">
            <span>Daily Activity Tracker</span>
          </h1>
          <p className="text-sm text-dark-400 mt-1">
            Log your everyday eco-actions, earn points, and build your sustainability streak.
          </p>
        </div>

        {isOfflineMode && (
          <div className="flex items-center space-x-2 text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl px-4 py-2.5 mt-4 md:mt-0">
            <AlertTriangle className="h-4 w-4" />
            <span>Running in Local Mode. Log in to sync across devices.</span>
          </div>
        )}
      </div>

      {/* Gamification Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {/* Level Progression Card */}
        <div className="glass-panel rounded-2xl p-6 border border-white/5 relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-dark-400 uppercase tracking-wider">Player Status</span>
              <h3 className="text-2xl font-bold text-white mt-1">LVL {playerLevel}</h3>
              <p className="text-xs font-semibold text-brand-400 mt-0.5">{levelTitle}</p>
            </div>
            <Award className="h-8 w-8 text-brand-400" />
          </div>
          
          <div className="mt-6">
            <div className="flex justify-between text-xxs text-dark-400 mb-1">
              <span>{totalPoints} Total Points</span>
              <span>{100 - nextLevelProgress} points to Lvl {playerLevel + 1}</span>
            </div>
            <div className="w-full bg-dark-900/60 rounded-full h-2 overflow-hidden border border-white/5">
              <div 
                className="bg-gradient-to-r from-brand-500 to-emerald-400 h-2 rounded-full transition-all duration-500"
                style={{ width: `${nextLevelProgress}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Carbon Offset Saved Card */}
        <div className="glass-panel rounded-2xl p-6 border border-white/5 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-dark-400 uppercase tracking-wider">Carbon Savings</span>
              <h3 className="text-3xl font-extrabold text-white mt-1 font-display">
                {totalCO2Saved} <span className="text-sm font-normal text-dark-300">kg CO₂</span>
              </h3>
              <p className="text-xs text-dark-400 mt-1">
                Equivalent to offsetting ~{Math.ceil(totalCO2Saved / 0.06)} smartphone charges.
              </p>
            </div>
            <div className="h-10 w-10 bg-brand-500/10 rounded-xl flex items-center justify-center border border-brand-500/20">
              <span className="text-sm font-bold text-brand-400">CO₂</span>
            </div>
          </div>
        </div>

        {/* Consecutive Streak Card */}
        <div className="glass-panel rounded-2xl p-6 border border-white/5 relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-dark-400 uppercase tracking-wider">Logging Streak</span>
              <h3 className="text-3xl font-extrabold text-white mt-1 flex items-center">
                {streak} <span className="text-sm font-normal text-dark-300 ml-1.5">{streak === 1 ? "day" : "days"}</span>
              </h3>
              <p className="text-xs text-dark-400 mt-1">
                {streak > 0 
                  ? "Amazing job! Log an action tomorrow to keep it lit." 
                  : "Log an action today to start your streak!"}
              </p>
            </div>
            <Flame className={`h-8 w-8 transition ${streak > 0 ? "text-orange-500 fill-orange-500/20 animate-pulse" : "text-dark-500"}`} />
          </div>
        </div>
      </div>

      {/* Action Logger and History Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Daily Action Logger Panel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="border-b border-white/5 pb-3">
            <h2 className="text-lg font-bold text-white">Log Today's Actions</h2>
            <p className="text-xs text-dark-400">Click to log any actions you took today.</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PREDEFINED_ACTIONS.map(action => (
              <div 
                key={action.id} 
                className="glass-panel rounded-2xl p-5 border border-white/5 hover:border-brand-500/30 transition-all duration-300 flex flex-col justify-between h-[180px] group"
              >
                <div className="flex justify-between items-start">
                  <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl">
                    {action.icon}
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <span className="text-xxs font-bold text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded-full border border-brand-500/20">
                      +{action.points} pts
                    </span>
                    <span className="text-[10px] text-dark-400 mt-1 font-semibold">
                      -{action.co2_saved} kg CO₂
                    </span>
                  </div>
                </div>

                <div className="mt-3">
                  <h4 className="text-sm font-bold text-white">{action.title}</h4>
                  <p className="text-xxs text-dark-400 line-clamp-2 mt-1 leading-relaxed">{action.description}</p>
                </div>

                <button
                  onClick={() => handleLogActivity(action)}
                  className="w-full mt-3 flex items-center justify-center space-x-1.5 bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs py-2 rounded-xl transition duration-200 shadow shadow-brand-600/15"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Log Action</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* History Timeline Side-Panel */}
        <div className="space-y-6">
          <div className="border-b border-white/5 pb-3 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-white">Activity Log</h2>
              <p className="text-xs text-dark-400">Your logged history timeline.</p>
            </div>
            {activities.length > 0 && (
              <button 
                onClick={handleClearAll}
                className="text-xxs text-rose-400 hover:text-rose-300 flex items-center space-x-1 hover:underline bg-rose-500/10 px-2 py-1 border border-rose-500/20 rounded-md transition"
              >
                <Trash2 className="h-3 w-3" />
                <span>Reset</span>
              </button>
            )}
          </div>

          <div className="glass-panel border border-white/5 rounded-2xl p-4 max-h-[500px] overflow-y-auto space-y-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-dark-400 space-y-2">
                <RefreshCw className="h-6 w-6 animate-spin text-brand-400" />
                <span className="text-xs">Loading logs...</span>
              </div>
            ) : activities.length > 0 ? (
              activities.map((act) => {
                const actionMeta = PREDEFINED_ACTIONS.find(a => a.id === act.action_id);
                return (
                  <div 
                    key={act.id} 
                    className="flex justify-between items-center bg-white/5 border border-white/5 rounded-xl p-3 hover:bg-white/[0.08] transition duration-200"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-dark-900 border border-white/10 rounded-lg text-brand-400">
                        {actionMeta ? actionMeta.icon : <Award className="h-4 w-4" />}
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-white">
                          {actionMeta ? actionMeta.title : "Eco Action"}
                        </h5>
                        <div className="flex items-center space-x-2 text-[10px] text-dark-400 mt-0.5">
                          <Calendar className="h-3 w-3" />
                          <span>{act.date}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <span className="text-xs font-bold text-brand-400 block">+{act.points} pts</span>
                        <span className="text-[10px] text-dark-500">-{act.co2_saved} kg</span>
                      </div>
                      
                      <button
                        onClick={() => handleDeleteActivity(act.id)}
                        className="text-dark-500 hover:text-rose-400 p-1.5 hover:bg-rose-500/10 rounded-lg transition"
                        title="Remove Log"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-20 text-dark-400 space-y-2">
                <Award className="h-8 w-8 mx-auto text-dark-500" />
                <p className="text-xs font-semibold">No actions logged yet.</p>
                <p className="text-xxs text-dark-500">Log one of the actions on the left to start earning points!</p>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
