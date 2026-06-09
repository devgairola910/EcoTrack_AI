import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "../services/api";
import type {
  AssessmentInput,
  AssessmentResponse,
  Recommendation,
  SimulationResponse
} from "../services/api";

export interface HistoryEntry {
  date: string;
  total_emissions: number; // in kg CO2e
  eco_score: number;
}

interface EcoContextType {
  assessmentInput: AssessmentInput;
  assessmentResult: AssessmentResponse | null;
  recommendations: Recommendation[];
  adoptedRecommendations: string[];
  simulationResult: SimulationResponse | null;
  history: HistoryEntry[];
  token: string | null;
  user: { id: number; email: string; name: string } | null;
  isCalculated: boolean;
  isLoading: boolean;
  calculate: (input: AssessmentInput) => Promise<void>;
  toggleRecommendation: (id: string) => Promise<void>;
  updateSimulationWithAdjustments: (adjustments: Record<string, any>) => Promise<void>;
  resetData: () => void;
  signup: (input: Record<string, string>) => Promise<void>;
  login: (input: Record<string, string>) => Promise<void>;
  logout: () => void;
}

const defaultInput: AssessmentInput = {
  transport: {
    vehicle_type: "petrol",
    annual_mileage_km: 8000,
    public_transit_km: 1500,
    flight_hours_short_haul: 6,
    flight_hours_long_haul: 10
  },
  energy: {
    electricity_kwh_monthly: 320,
    gas_kwh_monthly: 120,
    heating_oil_kwh_monthly: 0,
    renewable_energy_pct: 15
  },
  diet: {
    diet_type: "average_meat"
  },
  consumption: {
    monthly_shopping_spend: 350,
    recycle_habits: "sometimes",
    compost_habits: "never"
  }
};

const EcoContext = createContext<EcoContextType | undefined>(undefined);

export const EcoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [assessmentInput, setAssessmentInput] = useState<AssessmentInput>(() => {
    const saved = localStorage.getItem("ecotrack_input");
    return saved ? JSON.parse(saved) : defaultInput;
  });

  const [assessmentResult, setAssessmentResult] = useState<AssessmentResponse | null>(() => {
    const saved = localStorage.getItem("ecotrack_result");
    return saved ? JSON.parse(saved) : null;
  });

  const [recommendations, setRecommendations] = useState<Recommendation[]>(() => {
    const saved = localStorage.getItem("ecotrack_recs");
    return saved ? JSON.parse(saved) : [];
  });

  const [adoptedRecommendations, setAdoptedRecommendations] = useState<string[]>(() => {
    const saved = localStorage.getItem("ecotrack_adopted");
    return saved ? JSON.parse(saved) : [];
  });

  const [simulationResult, setSimulationResult] = useState<SimulationResponse | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    const saved = localStorage.getItem("ecotrack_history");
    return saved ? JSON.parse(saved) : [];
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem("ecotrack_token");
  });
  const [user, setUser] = useState<{ id: number; email: string; name: string } | null>(() => {
    const saved = localStorage.getItem("ecotrack_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [isCalculated, setIsCalculated] = useState<boolean>(() => {
    return localStorage.getItem("ecotrack_calculated") === "true";
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Sync state to local storage for persistence
  useEffect(() => {
    localStorage.setItem("ecotrack_input", JSON.stringify(assessmentInput));
    localStorage.setItem("ecotrack_calculated", String(isCalculated));
    if (assessmentResult) localStorage.setItem("ecotrack_result", JSON.stringify(assessmentResult));
    localStorage.setItem("ecotrack_recs", JSON.stringify(recommendations));
    localStorage.setItem("ecotrack_adopted", JSON.stringify(adoptedRecommendations));
    localStorage.setItem("ecotrack_history", JSON.stringify(history));
    if (token) localStorage.setItem("ecotrack_token", token);
    else localStorage.removeItem("ecotrack_token");
    if (user) localStorage.setItem("ecotrack_user", JSON.stringify(user));
    else localStorage.removeItem("ecotrack_user");
  }, [assessmentInput, assessmentResult, recommendations, adoptedRecommendations, isCalculated, history, token, user]);

  // Load history from database when authenticated
  useEffect(() => {
    if (token) {
      api.fetchHistory(token)
        .then((dbHistory) => {
          if (dbHistory && dbHistory.length > 0) {
            const localHistory: HistoryEntry[] = dbHistory.map(entry => ({
              date: entry.date,
              total_emissions: entry.total_emissions,
              eco_score: entry.eco_score
            }));
            setHistory(localHistory);
          }
        })
        .catch(err => console.error("Error loading database history:", err));
    }
  }, [token]);

  // Compute live simulation when adopted recommendations change
  useEffect(() => {
    if (isCalculated && assessmentResult) {
      updateSimulation(adoptedRecommendations);
    }
  }, [adoptedRecommendations, isCalculated]);

  const calculate = async (input: AssessmentInput) => {
    setIsLoading(true);
    try {
      setAssessmentInput(input);
      const res = await api.fetchAssessment(input);
      setAssessmentResult(res);
      
      const recs = await api.fetchRecommendations(input);
      setRecommendations(recs);
      
      const currentEmissionsKg = Math.round(res.emissions.total);
      const currentScore = res.eco_score;
      const todayStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });

      let newHistory: HistoryEntry[] = [];
      if (history.length === 0) {
        // Seed past 3 months
        newHistory.push({
          date: "Mar 15",
          total_emissions: Math.round(currentEmissionsKg * 1.35),
          eco_score: Math.max(1, Math.round(currentScore * 0.8))
        });
        newHistory.push({
          date: "Apr 15",
          total_emissions: Math.round(currentEmissionsKg * 1.22),
          eco_score: Math.max(1, Math.round(currentScore * 0.88))
        });
        newHistory.push({
          date: "May 15",
          total_emissions: Math.round(currentEmissionsKg * 1.10),
          eco_score: Math.max(1, Math.round(currentScore * 0.94))
        });
        newHistory.push({
          date: todayStr,
          total_emissions: currentEmissionsKg,
          eco_score: currentScore
        });
      } else {
        newHistory = [...history];
        const existingIdx = newHistory.findIndex((e) => e.date === todayStr);
        if (existingIdx !== -1) {
          newHistory[existingIdx] = {
            date: todayStr,
            total_emissions: currentEmissionsKg,
            eco_score: currentScore
          };
        } else {
          newHistory.push({
            date: todayStr,
            total_emissions: currentEmissionsKg,
            eco_score: currentScore
          });
        }
      }
      setHistory(newHistory);

      // Save to database if logged in
      if (token) {
        api.saveHistory(token, {
          date: todayStr,
          total_emissions: currentEmissionsKg,
          eco_score: currentScore,
          raw_input: input
        }).catch(err => console.error("Database save failed:", err));
      }
      
      setIsCalculated(true);
      setAdoptedRecommendations([]); // Reset adopted choices on new calculation
    } catch (error) {
      console.error("Calculation failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSimulation = async (adopted: string[], customAdjustments?: Record<string, any>) => {
    try {
      const sim = await api.fetchSimulation({
        current_assessment: assessmentInput,
        adopted_recommendations: adopted,
        custom_adjustments: customAdjustments
      });
      setSimulationResult(sim);
    } catch (error) {
      console.error("Simulation failed:", error);
    }
  };

  const toggleRecommendation = async (id: string) => {
    setAdoptedRecommendations((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      return next;
    });
  };

  const updateSimulationWithAdjustments = async (adjustments: Record<string, any>) => {
    await updateSimulation(adoptedRecommendations, adjustments);
  };

  const signup = async (input: Record<string, string>) => {
    setIsLoading(true);
    try {
      const res = await api.signup(input);
      setToken(res.token);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (input: Record<string, string>) => {
    setIsLoading(true);
    try {
      const res = await api.login(input);
      setToken(res.token);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setHistory([]);
    setIsCalculated(false);
    setAssessmentResult(null);
    setRecommendations([]);
    setAdoptedRecommendations([]);
    setSimulationResult(null);
    localStorage.removeItem("ecotrack_token");
    localStorage.removeItem("ecotrack_user");
    localStorage.removeItem("ecotrack_history");
    localStorage.removeItem("ecotrack_result");
    localStorage.removeItem("ecotrack_recs");
    localStorage.removeItem("ecotrack_adopted");
    localStorage.removeItem("ecotrack_calculated");
  };

  const resetData = () => {
    if (token) {
      api.clearHistory(token).catch(err => console.error("Database clear failed:", err));
    }
    setAssessmentInput(defaultInput);
    setAssessmentResult(null);
    setRecommendations([]);
    setAdoptedRecommendations([]);
    setSimulationResult(null);
    setHistory([]);
    setIsCalculated(false);
    localStorage.removeItem("ecotrack_history");
    localStorage.removeItem("ecotrack_result");
    localStorage.removeItem("ecotrack_recs");
    localStorage.removeItem("ecotrack_adopted");
    localStorage.removeItem("ecotrack_calculated");
  };

  return (
    <EcoContext.Provider
      value={{
        assessmentInput,
        assessmentResult,
        recommendations,
        adoptedRecommendations,
        simulationResult,
        history,
        token,
        user,
        isCalculated,
        isLoading,
        calculate,
        toggleRecommendation,
        updateSimulationWithAdjustments,
        resetData,
        signup,
        login,
        logout
      }}
    >
      {children}
    </EcoContext.Provider>
  );
};

export const useEco = () => {
  const context = useContext(EcoContext);
  if (!context) throw new Error("useEco must be used within an EcoProvider");
  return context;
};
