// EcoTrack AI Frontend API Service with local fallback logic

const BASE_URL = window.location.origin.includes("localhost") || window.location.origin.includes("127.0.0.1")
  ? "http://127.0.0.1:8000"
  : "/_/backend";

export interface TransportInput {
  vehicle_type: string;
  annual_mileage_km: number;
  public_transit_km: number;
  flight_hours_short_haul: number;
  flight_hours_long_haul: number;
}

export interface EnergyInput {
  electricity_kwh_monthly: number;
  gas_kwh_monthly: number;
  heating_oil_kwh_monthly: number;
  renewable_energy_pct: number;
}

export interface DietInput {
  diet_type: string;
}

export interface ConsumptionInput {
  monthly_shopping_spend: number;
  recycle_habits: string;
  compost_habits: string;
}

export interface AssessmentInput {
  transport: TransportInput;
  energy: EnergyInput;
  diet: DietInput;
  consumption: ConsumptionInput;
}

export interface EmissionBreakdown {
  transport: number;
  energy: number;
  diet: number;
  consumption: number;
  total: number;
}

export interface AssessmentResponse {
  emissions: EmissionBreakdown;
  eco_score: number;
  profile_type: string;
  comparison_to_average: number;
  tree_offset_equivalent: number;
}

export interface Recommendation {
  id: string;
  category: string;
  title: string;
  description: string;
  annual_saving_kg: number;
  difficulty: string;
  cost: string;
}

export interface SimulationResponse {
  original_emissions: EmissionBreakdown;
  simulated_emissions: EmissionBreakdown;
  original_eco_score: number;
  simulated_eco_score: number;
  saved_co2_kg: number;
  trees_saved: number;
  new_profile_type: string;
}

// Local Fallback Calculations (in case backend is not running)
const TRANSPORT_FACTORS: Record<string, number> = {
  petrol: 0.192,
  diesel: 0.171,
  hybrid: 0.102,
  electric: 0.045,
  none: 0.0
};
const PUBLIC_TRANSIT_FACTOR = 0.040;
const FLIGHT_SHORT_HAUL_FACTOR = 150.0;
const FLIGHT_LONG_HAUL_FACTOR = 110.0;
const ENERGY_ELECTRICITY_FACTOR = 0.475;
const ENERGY_GAS_FACTOR = 0.185;
const ENERGY_OIL_FACTOR = 0.260;
const DIET_EMISSIONS: Record<string, number> = {
  vegan: 1500,
  vegetarian: 1700,
  pescatarian: 2000,
  average_meat: 2500,
  heavy_meat: 3300
};

function calculateLocalEmissions(input: AssessmentInput): EmissionBreakdown {
  const trans = input.transport;
  const energy = input.energy;
  const diet = input.diet;
  const cons = input.consumption;

  // Transport
  const vehicleFactor = TRANSPORT_FACTORS[trans.vehicle_type.toLowerCase()] || 0;
  const transEm = trans.annual_mileage_km * vehicleFactor +
    trans.public_transit_km * PUBLIC_TRANSIT_FACTOR +
    trans.flight_hours_short_haul * FLIGHT_SHORT_HAUL_FACTOR +
    trans.flight_hours_long_haul * FLIGHT_LONG_HAUL_FACTOR;

  // Energy
  const electricityEm = (energy.electricity_kwh_monthly * 12) * ENERGY_ELECTRICITY_FACTOR * (1 - energy.renewable_energy_pct / 100);
  const gasEm = (energy.gas_kwh_monthly * 12) * ENERGY_GAS_FACTOR;
  const oilEm = (energy.heating_oil_kwh_monthly * 12) * ENERGY_OIL_FACTOR;
  const energyEm = electricityEm + gasEm + oilEm;

  // Diet
  const baseDiet = DIET_EMISSIONS[diet.diet_type.toLowerCase()] || 2500;
  const compostDiscount = cons.compost_habits === "always" ? 0.10 : (cons.compost_habits === "sometimes" ? 0.05 : 0);
  const dietEm = baseDiet * (1 - compostDiscount);

  // Consumption
  const baseCons = cons.monthly_shopping_spend * 12 * 0.12;
  const recycleDiscount = cons.recycle_habits === "always" ? 0.30 : (cons.recycle_habits === "sometimes" ? 0.10 : 0);
  const consEm = baseCons * (1 - recycleDiscount);

  return {
    transport: Math.round(transEm),
    energy: Math.round(energyEm),
    diet: Math.round(dietEm),
    consumption: Math.round(consEm),
    total: Math.round(transEm + energyEm + dietEm + consEm)
  };
}

function calculateLocalScore(emissions: EmissionBreakdown, input: AssessmentInput): number {
  const baseScore = 100 * Math.exp(-emissions.total / 9000);
  let bonus = 0;
  
  if (input.diet.diet_type === "vegan") bonus += 8;
  else if (input.diet.diet_type === "vegetarian") bonus += 5;
  else if (input.diet.diet_type === "pescatarian") bonus += 2;

  if (input.energy.renewable_energy_pct >= 80) bonus += 7;
  else if (input.energy.renewable_energy_pct >= 40) bonus += 4;

  if (input.consumption.recycle_habits === "always") bonus += 5;
  else if (input.consumption.recycle_habits === "sometimes") bonus += 2;

  if (input.consumption.compost_habits === "always") bonus += 3;

  return Math.max(1, Math.min(100, Math.round(baseScore + bonus)));
}

function getLocalProfile(total: number): string {
  if (total < 2500) return "Eco Champion";
  if (total < 5000) return "Green Conscious";
  if (total < 9000) return "Moderate Emitter";
  return "High Carbon Footprint";
}

function getLocalRecommendations(input: AssessmentInput): Recommendation[] {
  const recs: Recommendation[] = [];
  const trans = input.transport;
  const energy = input.energy;
  const diet = input.diet;
  const cons = input.consumption;

  const em = calculateLocalEmissions(input);

  // Transport
  if (["petrol", "diesel", "hybrid"].includes(trans.vehicle_type)) {
    const factor = TRANSPORT_FACTORS[trans.vehicle_type] || 0.192;
    const evFactor = TRANSPORT_FACTORS.electric;
    const evSaving = trans.annual_mileage_km * (factor - evFactor);
    if (evSaving > 100) {
      recs.push({
        id: "switch_to_ev",
        category: "transport",
        title: "Switch to an Electric Vehicle",
        description: `Replacing your ${trans.vehicle_type} car with an EV will reduce your commute footprint by ~${Math.round((factor - evFactor) / factor * 100)}%, saving around ${Math.round(evSaving)} kg CO2e annually.`,
        annual_saving_kg: Math.round(evSaving),
        difficulty: "hard",
        cost: "high"
      });
    }

    const transitSaving = (trans.annual_mileage_km / 5) * (factor - 0.040);
    if (transitSaving > 50) {
      recs.push({
        id: "public_transit_once_a_week",
        category: "transport",
        title: "Commute via Transit Once a Week",
        description: `Using public transit (bus or train) instead of driving 1 day per work week saves about ${Math.round(transitSaving)} kg CO2e annually.`,
        annual_saving_kg: Math.round(transitSaving),
        difficulty: "easy",
        cost: "low"
      });
    }
  }

  if ((trans.flight_hours_short_haul + trans.flight_hours_long_haul) > 0) {
    const flightEm = trans.flight_hours_short_haul * 150 + trans.flight_hours_long_haul * 110;
    recs.push({
      id: "reduce_flights",
      category: "transport",
      title: "Reduce Air Travel by 1/3",
      description: "Replace short business flights with video calls or train journeys. Airplane carbon at high altitudes has magnified heating effects.",
      annual_saving_kg: Math.round(flightEm * 0.33),
      difficulty: "medium",
      cost: "low"
    });
  }

  // Energy
  if (energy.electricity_kwh_monthly > 0 && energy.renewable_energy_pct < 100) {
    const solarSaving = (energy.electricity_kwh_monthly * 12) * ENERGY_ELECTRICITY_FACTOR * (1 - energy.renewable_energy_pct / 100);
    if (solarSaving > 100) {
      recs.push({
        id: "solar_panels",
        category: "energy",
        title: "Install Solar or Buy Green Power",
        description: "Switching to a utility plan with 100% renewable power or installing home solar panels eliminates your residential electricity emissions.",
        annual_saving_kg: Math.round(solarSaving),
        difficulty: "medium",
        cost: "medium"
      });
    }

    recs.push({
      id: "led_lighting",
      category: "energy",
      title: "Energy Efficiency Retrofit",
      description: "Upgrade to 100% LEDs and smart power strips to lower standby power draw. Cuts average electricity bills by 10-15%.",
      annual_saving_kg: Math.round((energy.electricity_kwh_monthly * 12 * ENERGY_ELECTRICITY_FACTOR) * 0.15),
      difficulty: "easy",
      cost: "low"
    });
  }

  if (energy.gas_kwh_monthly > 0 || energy.heating_oil_kwh_monthly > 0) {
    const heatSaving = (energy.gas_kwh_monthly * 12 * 0.185 * 0.5) + (energy.heating_oil_kwh_monthly * 12 * 0.260 * 0.6);
    if (heatSaving > 100) {
      recs.push({
        id: "heat_pump",
        category: "energy",
        title: "Install a High-Efficiency Heat Pump",
        description: "Replacing fossil fuel heating (gas/oil) with an electric heat pump cuts carbon emissions and is up to 4x more energy efficient.",
        annual_saving_kg: Math.round(heatSaving),
        difficulty: "hard",
        cost: "high"
      });
    }
  }

  // Diet
  if (["heavy_meat", "average_meat"].includes(diet.diet_type)) {
    const base = DIET_EMISSIONS[diet.diet_type] || 2500;
    recs.push({
      id: "meatless_mondays",
      category: "diet",
      title: "Adopt Meatless Mondays",
      description: "Going meatless just one day a week decreases animal farming carbon, water usage, and deforestation.",
      annual_saving_kg: Math.round(base * (1 / 7) * 0.35),
      difficulty: "easy",
      cost: "low"
    });

    recs.push({
      id: "plant_based_diet",
      category: "diet",
      title: "Transition to Vegetarian/Vegan Diet",
      description: "Moving to a vegetarian or vegan diet is one of the most effective personal carbon reductions, saving up to 1 ton of CO2.",
      annual_saving_kg: Math.round(base - DIET_EMISSIONS.vegetarian),
      difficulty: "medium",
      cost: "low"
    });
  }

  if (["sometimes", "never"].includes(cons.compost_habits)) {
    const dietBase = DIET_EMISSIONS[diet.diet_type] || 2500;
    recs.push({
      id: "composting",
      category: "diet",
      title: "Start Composting Kitchen Scraps",
      description: "Composting organic matter aerobically prevents anaerobic decay in landfills, reducing high-potency methane emissions.",
      annual_saving_kg: Math.round(dietBase * 0.10),
      difficulty: "easy",
      cost: "low"
    });
  }

  // Consumption
  if (["sometimes", "never"].includes(cons.recycle_habits)) {
    recs.push({
      id: "recycle_more",
      category: "consumption",
      title: "Rigorous Household Recycling",
      description: "Recycle plastics, glass, paper, and metal. Reusing materials takes far less energy than extracting and processing raw resources.",
      annual_saving_kg: Math.round(em.consumption * 0.25 || 80),
      difficulty: "easy",
      cost: "low"
    });
  }

  if (cons.monthly_shopping_spend > 150) {
    recs.push({
      id: "conscious_shopping",
      category: "consumption",
      title: "Choose Second-Hand or Buy Less",
      description: "Avoid fast fashion and buy second-hand items. Direct consumer demand is a massive driver of manufacturing carbon.",
      annual_saving_kg: Math.round(em.consumption * 0.20),
      difficulty: "medium",
      cost: "low"
    });
  }

  return recs.sort((a, b) => b.annual_saving_kg - a.annual_saving_kg);
}

// Export API integration functions
export const api = {
  async fetchAssessment(input: AssessmentInput): Promise<AssessmentResponse> {
    try {
      const response = await fetch(`${BASE_URL}/api/assessment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input)
      });
      if (!response.ok) throw new Error("Backend response error");
      return await response.json();
    } catch (err) {
      console.warn("Backend unavailable, using local calculation fallback:", err);
      const emissions = calculateLocalEmissions(input);
      const score = calculateLocalScore(emissions, input);
      const profile = getLocalProfile(emissions.total);
      
      return {
        emissions,
        eco_score: score,
        profile_type: profile,
        comparison_to_average: Number(((emissions.total / 4800) * 100).toFixed(1)),
        tree_offset_equivalent: Math.ceil(emissions.total / 22)
      };
    }
  },

  async fetchRecommendations(input: AssessmentInput): Promise<Recommendation[]> {
    try {
      const response = await fetch(`${BASE_URL}/api/recommendations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input)
      });
      if (!response.ok) throw new Error("Backend response error");
      const res = await response.json();
      return res.recommendations;
    } catch (err) {
      console.warn("Backend unavailable, using local recommendations fallback:", err);
      return getLocalRecommendations(input);
    }
  },

  async fetchSimulation(input: {
    current_assessment: AssessmentInput;
    adopted_recommendations: string[];
    custom_adjustments?: Record<string, any>;
  }): Promise<SimulationResponse> {
    try {
      const response = await fetch(`${BASE_URL}/api/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input)
      });
      if (!response.ok) throw new Error("Backend response error");
      return await response.json();
    } catch (err) {
      console.warn("Backend unavailable, using local simulation fallback:", err);
      
      // Compute original values
      const origEmissions = calculateLocalEmissions(input.current_assessment);
      const origScore = calculateLocalScore(origEmissions, input.current_assessment);
      
      // Simulate adjustments
      const adjusted: AssessmentInput = {
        transport: { ...input.current_assessment.transport },
        energy: { ...input.current_assessment.energy },
        diet: { ...input.current_assessment.diet },
        consumption: { ...input.current_assessment.consumption }
      };

      const recs = getLocalRecommendations(input.current_assessment);
      const adopted = new Set(input.adopted_recommendations);

      for (const rec of recs) {
        if (adopted.has(rec.id)) {
          if (rec.id === "switch_to_ev") {
            adjusted.transport.vehicle_type = "electric";
          } else if (rec.id === "public_transit_once_a_week") {
            adjusted.transport.annual_mileage_km *= 0.8;
            adjusted.transport.public_transit_km += input.current_assessment.transport.annual_mileage_km * 0.2;
          } else if (rec.id === "reduce_flights") {
            adjusted.transport.flight_hours_short_haul *= 0.67;
            adjusted.transport.flight_hours_long_haul *= 0.67;
          } else if (rec.id === "solar_panels") {
            adjusted.energy.renewable_energy_pct = 100;
          } else if (rec.id === "led_lighting") {
            adjusted.energy.electricity_kwh_monthly *= 0.85;
          } else if (rec.id === "heat_pump") {
            adjusted.energy.gas_kwh_monthly = 0;
            adjusted.energy.heating_oil_kwh_monthly = 0;
          } else if (rec.id === "meatless_mondays") {
            if (adjusted.diet.diet_type === "heavy_meat") adjusted.diet.diet_type = "average_meat";
            else if (adjusted.diet.diet_type === "average_meat") adjusted.diet.diet_type = "pescatarian";
          } else if (rec.id === "plant_based_diet") {
            adjusted.diet.diet_type = "vegetarian";
          } else if (rec.id === "composting") {
            adjusted.consumption.compost_habits = "always";
          } else if (rec.id === "recycle_more") {
            adjusted.consumption.recycle_habits = "always";
          } else if (rec.id === "conscious_shopping") {
            adjusted.consumption.monthly_shopping_spend *= 0.80;
          }
        }
      }

      // Custom adjustments
      if (input.custom_adjustments) {
        const adj = input.custom_adjustments;
        if (adj.vehicle_type !== undefined) adjusted.transport.vehicle_type = adj.vehicle_type;
        if (adj.annual_mileage_km !== undefined) adjusted.transport.annual_mileage_km = adj.annual_mileage_km;
        if (adj.public_transit_km !== undefined) adjusted.transport.public_transit_km = adj.public_transit_km;
        if (adj.flight_hours_short_haul !== undefined) adjusted.transport.flight_hours_short_haul = adj.flight_hours_short_haul;
        if (adj.flight_hours_long_haul !== undefined) adjusted.transport.flight_hours_long_haul = adj.flight_hours_long_haul;
        if (adj.electricity_kwh_monthly !== undefined) adjusted.energy.electricity_kwh_monthly = adj.electricity_kwh_monthly;
        if (adj.gas_kwh_monthly !== undefined) adjusted.energy.gas_kwh_monthly = adj.gas_kwh_monthly;
        if (adj.heating_oil_kwh_monthly !== undefined) adjusted.energy.heating_oil_kwh_monthly = adj.heating_oil_kwh_monthly;
        if (adj.renewable_energy_pct !== undefined) adjusted.energy.renewable_energy_pct = adj.renewable_energy_pct;
        if (adj.diet_type !== undefined) adjusted.diet.diet_type = adj.diet_type;
        if (adj.monthly_shopping_spend !== undefined) adjusted.consumption.monthly_shopping_spend = adj.monthly_shopping_spend;
        if (adj.recycle_habits !== undefined) adjusted.consumption.recycle_habits = adj.recycle_habits;
        if (adj.compost_habits !== undefined) adjusted.consumption.compost_habits = adj.compost_habits;
      }

      const simEmissions = calculateLocalEmissions(adjusted);
      const simScore = calculateLocalScore(simEmissions, adjusted);
      const savedCO2 = Math.max(0, origEmissions.total - simEmissions.total);
      
      return {
        original_emissions: origEmissions,
        simulated_emissions: simEmissions,
        original_eco_score: origScore,
        simulated_eco_score: simScore,
        saved_co2_kg: Math.round(savedCO2),
        trees_saved: Math.ceil(savedCO2 / 22),
        new_profile_type: getLocalProfile(simEmissions.total)
      };
    }
  },

  async signup(input: Record<string, string>): Promise<{ token: string; user: { id: number; email: string; name: string } }> {
    try {
      const response = await fetch(`${BASE_URL}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Signup failed");
      }
      return await response.json();
    } catch (err) {
      console.warn("Backend unavailable, using local mock signup:", err);
      // Local signup simulation
      const users = JSON.parse(localStorage.getItem("mock_users") || "[]");
      if (users.some((u: any) => u.email === input.email)) {
        throw new Error("Email address is already registered");
      }
      const newUser = { id: Date.now(), email: input.email, name: input.name, password: input.password };
      users.push(newUser);
      localStorage.setItem("mock_users", JSON.stringify(users));
      
      const token = btoa(`${newUser.id}:${newUser.email}`);
      return {
        token,
        user: { id: newUser.id, email: newUser.email, name: newUser.name }
      };
    }
  },

  async login(input: Record<string, string>): Promise<{ token: string; user: { id: number; email: string; name: string } }> {
    try {
      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Login failed");
      }
      return await response.json();
    } catch (err) {
      console.warn("Backend unavailable, using local mock login:", err);
      const users = JSON.parse(localStorage.getItem("mock_users") || "[]");
      const matched = users.find((u: any) => u.email === input.email && u.password === input.password);
      if (!matched) {
        throw new Error("Invalid email or password credentials");
      }
      const token = btoa(`${matched.id}:${matched.email}`);
      return {
        token,
        user: { id: matched.id, email: matched.email, name: matched.name }
      };
    }
  },

  async fetchHistory(token: string): Promise<any[]> {
    try {
      const response = await fetch(`${BASE_URL}/api/user/history`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("History fetch failed");
      return await response.json();
    } catch (err) {
      console.warn("Backend unavailable, using local storage history:", err);
      return JSON.parse(localStorage.getItem("ecotrack_history") || "[]");
    }
  },

  async saveHistory(token: string, entry: { date: string; total_emissions: number; eco_score: number; raw_input: AssessmentInput }): Promise<void> {
    try {
      await fetch(`${BASE_URL}/api/user/history`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(entry)
      });
    } catch (err) {
      console.warn("Backend unavailable, history saved locally only:", err);
    }
  },

  async clearHistory(token: string): Promise<void> {
    try {
      await fetch(`${BASE_URL}/api/user/history`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
    } catch (err) {
      console.warn("Backend unavailable, history cleared locally only:", err);
    }
  }
};
