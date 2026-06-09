import React, { useState, useEffect } from "react";
import { 
  Info, TreePine, RotateCcw,
  Sparkles, Car, Zap, Apple, ShoppingBag
} from "lucide-react";
import { useEco } from "../context/EcoContext";

interface SustainabilitySimulatorProps {
  setCurrentPage: (page: string) => void;
}

export const SustainabilitySimulator: React.FC<SustainabilitySimulatorProps> = ({ setCurrentPage }) => {
  const { 
    assessmentResult, 
    assessmentInput, 
    simulationResult, 
    updateSimulationWithAdjustments 
  } = useEco();

  if (!assessmentResult) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-4">
        <Info className="h-12 w-12 text-blue-400" />
        <h2 className="text-xl font-bold text-white">Assessment Required</h2>
        <p className="text-sm text-dark-400">Please complete the Carbon Calculator assessment first to populate baseline data.</p>
        <button
          onClick={() => setCurrentPage("calculator")}
          className="bg-brand-600 hover:bg-brand-500 text-white px-6 py-2.5 rounded-xl font-semibold transition"
        >
          Go to Calculator
        </button>
      </div>
    );
  }

  // Setup state mirroring assessment inputs
  const [vehicleType, setVehicleType] = useState(assessmentInput.transport.vehicle_type);
  const [mileage, setMileage] = useState(assessmentInput.transport.annual_mileage_km);
  const [renewablePct, setRenewablePct] = useState(assessmentInput.energy.renewable_energy_pct);
  const [dietType, setDietType] = useState(assessmentInput.diet.diet_type);
  const [shoppingSpend, setShoppingSpend] = useState(assessmentInput.consumption.monthly_shopping_spend);
  const [recycleHabits, setRecycleHabits] = useState(assessmentInput.consumption.recycle_habits);
  const [compostHabits, setCompostHabits] = useState(assessmentInput.consumption.compost_habits);

  // Trigger simulation update when state changes
  useEffect(() => {
    updateSimulationWithAdjustments({
      vehicle_type: vehicleType,
      annual_mileage_km: mileage,
      renewable_energy_pct: renewablePct,
      diet_type: dietType,
      monthly_shopping_spend: shoppingSpend,
      recycle_habits: recycleHabits,
      compost_habits: compostHabits
    });
  }, [vehicleType, mileage, renewablePct, dietType, shoppingSpend, recycleHabits, compostHabits]);

  const handleReset = () => {
    setVehicleType(assessmentInput.transport.vehicle_type);
    setMileage(assessmentInput.transport.annual_mileage_km);
    setRenewablePct(assessmentInput.energy.renewable_energy_pct);
    setDietType(assessmentInput.diet.diet_type);
    setShoppingSpend(assessmentInput.consumption.monthly_shopping_spend);
    setRecycleHabits(assessmentInput.consumption.recycle_habits);
    setCompostHabits(assessmentInput.consumption.compost_habits);
  };

  const sim = simulationResult;
  const originalScore = assessmentResult.eco_score;
  const simulatedScore = sim ? sim.simulated_eco_score : originalScore;
  const savedCarbon = sim ? sim.saved_co2_kg : 0;
  const originalTotalTons = Math.round((assessmentResult.emissions.total / 1000) * 10) / 10;
  const simulatedTotalTons = sim ? Math.round((sim.simulated_emissions.total / 1000) * 10) / 10 : originalTotalTons;

  const scoreDiff = simulatedScore - originalScore;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 bg-gradient-glow min-h-[85vh]">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Sustainability Simulator</h1>
          <p className="text-sm text-dark-400 mt-1">Interact with your carbon model to simulate carbon offsets live.</p>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center space-x-2 text-xs font-semibold px-4 py-2 border border-white/10 hover:border-brand-500/30 hover:bg-brand-500/10 text-dark-300 hover:text-brand-400 rounded-xl transition duration-300 mt-4 md:mt-0"
        >
          <RotateCcw className="h-4 w-4" />
          <span>Reset to Baseline</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Simulator Controls: Slider/Toggle Board */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Transport Adjustments */}
          <div className="glass-panel rounded-3xl p-6 border border-white/5 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Car className="h-4.5 w-4.5 text-amber-400" />
              <span>Transportation Shifts</span>
            </h3>

            {/* Vehicle Select */}
            <div className="space-y-2">
              <label className="text-xs text-dark-400 font-semibold uppercase tracking-wider">Commute Fuel Source</label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {[
                  { id: "petrol", label: "Petrol" },
                  { id: "diesel", label: "Diesel" },
                  { id: "hybrid", label: "Hybrid" },
                  { id: "electric", label: "Electric" },
                  { id: "none", label: "No Car" }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setVehicleType(item.id)}
                    className={`py-2 rounded-xl text-xs font-medium border text-center transition-all ${
                      vehicleType === item.id
                        ? "bg-amber-500/10 border-amber-500/40 text-amber-400"
                        : "bg-dark-900/40 border-white/5 text-dark-400 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mileage Slider */}
            {vehicleType !== "none" && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label htmlFor="sim_mileage" className="text-xs text-dark-300 font-semibold uppercase tracking-wider">Annual Driving</label>
                  <span className="text-xs text-amber-400 font-bold">{mileage.toLocaleString()} km</span>
                </div>
                <input 
                  id="sim_mileage"
                  type="range"
                  min="0"
                  max="35000"
                  step="500"
                  value={mileage}
                  onChange={(e) => setMileage(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer bg-dark-900 rounded-lg appearance-none h-1.5"
                />
              </div>
            )}
          </div>

          {/* Energy Adjustments */}
          <div className="glass-panel rounded-3xl p-6 border border-white/5 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Zap className="h-4.5 w-4.5 text-orange-400" />
              <span>Electricity & Heat Mix</span>
            </h3>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <label htmlFor="sim_renewable" className="text-xs text-dark-300 font-semibold uppercase tracking-wider">Renewable Power Grid Portion</label>
                <span className="text-xs text-orange-400 font-bold">{renewablePct}%</span>
              </div>
              <input 
                id="sim_renewable"
                type="range"
                min="0"
                max="100"
                step="5"
                value={renewablePct}
                onChange={(e) => setRenewablePct(Number(e.target.value))}
                className="w-full accent-orange-500 cursor-pointer bg-dark-900 rounded-lg appearance-none h-1.5"
              />
            </div>
          </div>

          {/* Diet Adjustments */}
          <div className="glass-panel rounded-3xl p-6 border border-white/5 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Apple className="h-4.5 w-4.5 text-emerald-400" />
              <span>Dietary Shift</span>
            </h3>
            <div className="space-y-2">
              <label className="text-xs text-dark-400 font-semibold uppercase tracking-wider">Primary Dietary Choice</label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {[
                  { id: "heavy_meat", label: "Meat-Heavy" },
                  { id: "average_meat", label: "Avg Meat" },
                  { id: "pescatarian", label: "Pescatarian" },
                  { id: "vegetarian", label: "Vegetarian" },
                  { id: "vegan", label: "Vegan" }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setDietType(item.id)}
                    className={`py-2 rounded-xl text-xxs font-medium border text-center transition-all ${
                      dietType === item.id
                        ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                        : "bg-dark-900/40 border-white/5 text-dark-400 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Consumption Adjustments */}
          <div className="glass-panel rounded-3xl p-6 border border-white/5 space-y-5">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <ShoppingBag className="h-4.5 w-4.5 text-purple-400" />
              <span>Consumption & Recycling</span>
            </h3>

            {/* Shopping Spend */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <label htmlFor="sim_shopping" className="text-xs text-dark-300 font-semibold uppercase tracking-wider">Monthly Spend</label>
                <span className="text-xs text-purple-400 font-bold">${shoppingSpend}</span>
              </div>
              <input 
                id="sim_shopping"
                type="range"
                min="0"
                max="1500"
                step="50"
                value={shoppingSpend}
                onChange={(e) => setShoppingSpend(Number(e.target.value))}
                className="w-full accent-purple-500 cursor-pointer bg-dark-900 rounded-lg appearance-none h-1.5"
              />
            </div>

            {/* Recycling Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="text-xs text-dark-400 font-semibold uppercase tracking-wider block">Rigorous Recycling</span>
                <div className="grid grid-cols-3 gap-2">
                  {["never", "sometimes", "always"].map((habit) => (
                    <button
                      key={habit}
                      type="button"
                      onClick={() => setRecycleHabits(habit)}
                      className={`py-2 rounded-xl border text-center text-xs font-semibold capitalize transition-all ${
                        recycleHabits === habit
                          ? "bg-purple-500/10 border-purple-500/40 text-purple-400"
                          : "bg-dark-900/40 border-white/5 text-dark-400 hover:text-white"
                      }`}
                    >
                      {habit}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs text-dark-400 font-semibold uppercase tracking-wider block">Food Composting</span>
                <div className="grid grid-cols-3 gap-2">
                  {["never", "sometimes", "always"].map((habit) => (
                    <button
                      key={habit}
                      type="button"
                      onClick={() => setCompostHabits(habit)}
                      className={`py-2 rounded-xl border text-center text-xs font-semibold capitalize transition-all ${
                        compostHabits === habit
                          ? "bg-purple-500/10 border-purple-500/40 text-purple-400"
                          : "bg-dark-900/40 border-white/5 text-dark-400 hover:text-white"
                      }`}
                    >
                      {habit}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Simulation Output Panel */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Simulated Score Card */}
          <div className="glass-panel rounded-3xl p-6 border border-white/5 text-center relative overflow-hidden flex flex-col items-center justify-center min-h-[300px]">
            <div className="absolute top-0 right-0 h-20 w-20 bg-brand-500/10 rounded-full blur-2xl" />
            <span className="text-xs text-dark-400 font-semibold uppercase tracking-wider block mb-4">Simulated Eco Score</span>

            {/* Circular score gauge */}
            <div className="relative h-40 w-40 flex items-center justify-center rounded-full border-4 border-white/5 bg-dark-900 shadow-inner">
              {/* Spinning track effect if score is positive delta */}
              <div 
                className="absolute inset-0 rounded-full border-4 border-brand-500 transition-all duration-700"
                style={{
                  clipPath: `polygon(50% 50%, 50% 0%, ${simulatedScore >= 50 ? '100% 0%, 100% 100%, 0% 100%, 0% 0%' : '100% 0%, 100% 100%'})`,
                  transform: `rotate(${simulatedScore * 3.6}deg)` // placeholder gauge approximation
                }}
              />
              <div className="z-10 flex flex-col items-center justify-center">
                <span className="text-6xl font-extrabold text-white font-display leading-none">{simulatedScore}</span>
                {scoreDiff !== 0 && (
                  <span className={`text-xs font-bold mt-1.5 px-2.5 py-0.5 rounded-full ${scoreDiff > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                    {scoreDiff > 0 ? `+${scoreDiff}` : scoreDiff} pts
                  </span>
                )}
              </div>
            </div>

            <span className="text-xs text-dark-400 mt-6 uppercase tracking-wider block">
              Profile: <strong className="text-white">{sim ? sim.new_profile_type : assessmentResult.profile_type}</strong>
            </span>
          </div>

          {/* Savings details */}
          <div className="glass-panel rounded-3xl p-6 border border-white/5 space-y-5">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Sparkles className="h-4 w-4 text-brand-400" />
              <span>Simulated CO2 Avoidance</span>
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-dark-900 border border-white/5 rounded-2xl p-4 text-center">
                <span className="block text-xxs text-dark-400 uppercase font-semibold">Tons CO2e</span>
                <span className="text-2xl font-extrabold text-white block mt-1">
                  {simulatedTotalTons}t
                </span>
                <span className="text-[10px] text-dark-500">original: {originalTotalTons}t</span>
              </div>

              <div className="bg-dark-900 border border-white/5 rounded-2xl p-4 text-center">
                <span className="block text-xxs text-dark-400 uppercase font-semibold">Trees Equivalent</span>
                <span className="text-2xl font-extrabold text-brand-400 block mt-1 flex items-center justify-center">
                  <TreePine className="h-5.5 w-5.5 text-brand-500 mr-1" />
                  {sim ? sim.trees_saved : 0}
                </span>
                <span className="text-[10px] text-dark-500">saved trees / year</span>
              </div>
            </div>

            {savedCarbon > 0 ? (
              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4 text-center text-xs text-emerald-400 font-medium leading-relaxed">
                🎉 Your custom changes simulate a carbon reduction of **{savedCarbon.toLocaleString()} kg CO2e** per year!
              </div>
            ) : (
              <div className="bg-dark-900 border border-white/5 rounded-2xl p-4 text-center text-xs text-dark-500 leading-relaxed">
                Drag the sliders to reduce your carbon footprint and watch the offsets compute in real-time.
              </div>
            )}

            <button
              onClick={() => setCurrentPage("recommendations")}
              className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-3.5 rounded-2xl text-xs transition duration-300 shadow-lg shadow-brand-600/10"
            >
              Check Action Recommendations
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
