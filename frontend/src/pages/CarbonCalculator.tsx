import React, { useState } from "react";
import { 
  Car, Plane, Zap, Flame, 
  Smile, ArrowLeft, ArrowRight, CheckCircle, Leaf
} from "lucide-react";
import { useEco } from "../context/EcoContext";
import type { AssessmentInput } from "../services/api";

interface CarbonCalculatorProps {
  setCurrentPage: (page: string) => void;
}

export const CarbonCalculator: React.FC<CarbonCalculatorProps> = ({ setCurrentPage }) => {
  const { calculate, assessmentInput, isLoading } = useEco();
  const [step, setStep] = useState(1);
  
  // Clone context input to local wizard state
  const [formData, setFormData] = useState<AssessmentInput>({
    transport: { ...assessmentInput.transport },
    energy: { ...assessmentInput.energy },
    diet: { ...assessmentInput.diet },
    consumption: { ...assessmentInput.consumption }
  });

  const totalSteps = 4;

  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    await calculate(formData);
    // Redirect to dashboard
    setCurrentPage("dashboard");
  };

  // Live estimate calculation on the client side for visual feedback in the wizard!
  const calculateLiveEstimate = () => {
    const TRANSPORT_FACTORS: Record<string, number> = {
      petrol: 0.192, diesel: 0.171, hybrid: 0.102, electric: 0.045, none: 0.0
    };
    
    // Transport
    const vFactor = TRANSPORT_FACTORS[formData.transport.vehicle_type] || 0;
    const transEm = (formData.transport.annual_mileage_km * vFactor) +
      (formData.transport.public_transit_km * 0.040) +
      (formData.transport.flight_hours_short_haul * 150) +
      (formData.transport.flight_hours_long_haul * 110);
      
    // Energy
    const elecEm = (formData.energy.electricity_kwh_monthly * 12) * 0.475 * (1 - formData.energy.renewable_energy_pct / 100);
    const gasEm = (formData.energy.gas_kwh_monthly * 12) * 0.185;
    const oilEm = (formData.energy.heating_oil_kwh_monthly * 12) * 0.260;
    const energyEm = elecEm + gasEm + oilEm;

    // Diet
    const DIET_EMISSIONS: Record<string, number> = {
      vegan: 1500, vegetarian: 1700, pescatarian: 2000, average_meat: 2500, heavy_meat: 3300
    };
    const dietBase = DIET_EMISSIONS[formData.diet.diet_type] || 2500;
    const compostDiscount = formData.consumption.compost_habits === "always" ? 0.10 : (formData.consumption.compost_habits === "sometimes" ? 0.05 : 0);
    const dietEm = dietBase * (1 - compostDiscount);

    // Consumption
    const shopEm = formData.consumption.monthly_shopping_spend * 12 * 0.12;
    const recycleDiscount = formData.consumption.recycle_habits === "always" ? 0.30 : (formData.consumption.recycle_habits === "sometimes" ? 0.10 : 0);
    const consEm = shopEm * (1 - recycleDiscount);

    return Math.round((transEm + energyEm + dietEm + consEm) / 100) / 10; // in tons CO2e
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 bg-gradient-glow min-h-[85vh]">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-white sm:text-4xl">Carbon Footprint Calculator</h1>
        <p className="text-sm text-dark-400 mt-2">Tell us about your daily habits to calculate your environmental footprint.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Wizard Panel */}
        <div className="lg:col-span-2 glass-panel rounded-3xl p-6 sm:p-8 border border-white/5 relative overflow-hidden flex flex-col justify-between min-h-[500px]">
          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex justify-between items-center text-xs font-semibold text-dark-400 uppercase tracking-wider mb-2">
              <span>Step {step} of {totalSteps}</span>
              <span className="text-brand-400">
                {step === 1 && "Transportation"}
                {step === 2 && "Home Energy"}
                {step === 3 && "Diet & Food"}
                {step === 4 && "Consumption & Habits"}
              </span>
            </div>
            <div className="w-full bg-dark-900 h-2 rounded-full overflow-hidden border border-white/5">
              <div 
                className="bg-brand-500 h-full transition-all duration-500 ease-out" 
                style={{ width: `${(step / totalSteps) * 100}%` }}
              />
            </div>
          </div>

          {/* Form Steps */}
          <div className="flex-1 mb-8">
            {/* Step 1: Transport */}
            {step === 1 && (
              <div className="space-y-6 animate-fade-in">
                <h3 className="text-lg font-semibold text-white">Daily Commuting & Travel</h3>
                
                {/* Vehicle Type Selection Grid */}
                <div className="space-y-2">
                  <label className="text-xs text-dark-300 font-semibold uppercase tracking-wider">Primary Commute Vehicle</label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {[
                      { id: "petrol", label: "Petrol", icon: <Car className="h-5 w-5 text-red-400" /> },
                      { id: "diesel", label: "Diesel", icon: <Car className="h-5 w-5 text-orange-400" /> },
                      { id: "hybrid", label: "Hybrid", icon: <Car className="h-5 w-5 text-yellow-400" /> },
                      { id: "electric", label: "Electric", icon: <Leaf className="h-5 w-5 text-brand-400" /> },
                      { id: "none", label: "No Car", icon: <Smile className="h-5 w-5 text-blue-400" /> }
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setFormData({
                          ...formData,
                          transport: { ...formData.transport, vehicle_type: item.id }
                        })}
                        className={`flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all duration-300 ${
                          formData.transport.vehicle_type === item.id
                            ? "bg-brand-500/10 border-brand-500 text-white"
                            : "bg-dark-900/40 border-white/5 text-dark-300 hover:border-white/10 hover:text-white"
                        }`}
                      >
                        {item.icon}
                        <span className="text-xs font-medium mt-2">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Driving Mileage */}
                {formData.transport.vehicle_type !== "none" && (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <label className="text-xs text-dark-300 font-semibold uppercase tracking-wider">Annual Driving Distance</label>
                      <span className="text-xs text-brand-400 font-bold">{formData.transport.annual_mileage_km.toLocaleString()} km</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="35000" 
                      step="500"
                      value={formData.transport.annual_mileage_km}
                      onChange={(e) => setFormData({
                        ...formData,
                        transport: { ...formData.transport, annual_mileage_km: Number(e.target.value) }
                      })}
                      className="w-full accent-brand-500 cursor-pointer bg-dark-900 rounded-lg appearance-none h-1.5"
                    />
                  </div>
                )}

                {/* Public Transit */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label className="text-xs text-dark-300 font-semibold uppercase tracking-wider">Public Transit (Bus, Train, Subways)</label>
                    <span className="text-xs text-brand-400 font-bold">{formData.transport.public_transit_km.toLocaleString()} km/year</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="15000" 
                    step="200"
                    value={formData.transport.public_transit_km}
                    onChange={(e) => setFormData({
                      ...formData,
                      transport: { ...formData.transport, public_transit_km: Number(e.target.value) }
                    })}
                    className="w-full accent-brand-500 cursor-pointer bg-dark-900 rounded-lg appearance-none h-1.5"
                  />
                </div>

                {/* Flight Hours Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs text-dark-300 font-semibold uppercase tracking-wider">Short-Haul Flights (&lt; 3 hrs)</label>
                    <div className="relative">
                      <input 
                        type="number"
                        min="0"
                        value={formData.transport.flight_hours_short_haul}
                        onChange={(e) => setFormData({
                          ...formData,
                          transport: { ...formData.transport, flight_hours_short_haul: Math.max(0, Number(e.target.value)) }
                        })}
                        className="glass-input w-full pl-10"
                      />
                      <Plane className="absolute left-3 top-3.5 h-4 w-4 text-dark-400 rotate-45" />
                    </div>
                    <span className="text-[10px] text-dark-500 block">Total flights hours per year</span>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-dark-300 font-semibold uppercase tracking-wider">Long-Haul Flights (&gt; 3 hrs)</label>
                    <div className="relative">
                      <input 
                        type="number"
                        min="0"
                        value={formData.transport.flight_hours_long_haul}
                        onChange={(e) => setFormData({
                          ...formData,
                          transport: { ...formData.transport, flight_hours_long_haul: Math.max(0, Number(e.target.value)) }
                        })}
                        className="glass-input w-full pl-10"
                      />
                      <Plane className="absolute left-3 top-3.5 h-4 w-4 text-dark-400" />
                    </div>
                    <span className="text-[10px] text-dark-500 block">Total flights hours per year</span>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Home Energy */}
            {step === 2 && (
              <div className="space-y-6 animate-fade-in">
                <h3 className="text-lg font-semibold text-white">Residential Energy Consumptions</h3>

                {/* Electricity */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label className="text-xs text-dark-300 font-semibold uppercase tracking-wider">Monthly Electricity Usage (kWh)</label>
                    <span className="text-xs text-brand-400 font-bold">{formData.energy.electricity_kwh_monthly} kWh</span>
                  </div>
                  <div className="relative">
                    <input 
                      type="range" 
                      min="0" 
                      max="1500" 
                      step="25"
                      value={formData.energy.electricity_kwh_monthly}
                      onChange={(e) => setFormData({
                        ...formData,
                        energy: { ...formData.energy, electricity_kwh_monthly: Number(e.target.value) }
                      })}
                      className="w-full accent-brand-500 cursor-pointer bg-dark-900 rounded-lg appearance-none h-1.5"
                    />
                    <Zap className="absolute right-0 -top-8 h-4 w-4 text-brand-400" />
                  </div>
                </div>

                {/* Gas */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label className="text-xs text-dark-300 font-semibold uppercase tracking-wider">Monthly Natural Gas Usage (kWh/Units)</label>
                    <span className="text-xs text-brand-400 font-bold">{formData.energy.gas_kwh_monthly} kWh</span>
                  </div>
                  <div className="relative">
                    <input 
                      type="range" 
                      min="0" 
                      max="1500" 
                      step="25"
                      value={formData.energy.gas_kwh_monthly}
                      onChange={(e) => setFormData({
                        ...formData,
                        energy: { ...formData.energy, gas_kwh_monthly: Number(e.target.value) }
                      })}
                      className="w-full accent-brand-500 cursor-pointer bg-dark-900 rounded-lg appearance-none h-1.5"
                    />
                    <Flame className="absolute right-0 -top-8 h-4 w-4 text-orange-400" />
                  </div>
                </div>

                {/* Renewable Energy Percentage */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label className="text-xs text-dark-300 font-semibold uppercase tracking-wider">Renewable Energy Portion</label>
                    <span className="text-xs text-brand-400 font-bold">{formData.energy.renewable_energy_pct}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    step="5"
                    value={formData.energy.renewable_energy_pct}
                    onChange={(e) => setFormData({
                      ...formData,
                      energy: { ...formData.energy, renewable_energy_pct: Number(e.target.value) }
                    })}
                    className="w-full accent-brand-500 cursor-pointer bg-dark-900 rounded-lg appearance-none h-1.5"
                  />
                  <span className="text-[10px] text-dark-500 block mt-1">
                    Percentage of your home electricity backed by solar, wind, or low-carbon tariffs.
                  </span>
                </div>
              </div>
            )}

            {/* Step 3: Diet & Food */}
            {step === 3 && (
              <div className="space-y-6 animate-fade-in">
                <h3 className="text-lg font-semibold text-white">Dietary Habits</h3>
                
                <div className="space-y-4">
                  <label className="text-xs text-dark-300 font-semibold uppercase tracking-wider block">Which diet matches yours best?</label>
                  
                  <div className="space-y-3">
                    {[
                      { id: "vegan", label: "Vegan", desc: "100% plant-based. No meat, dairy, or eggs.", em: "~1.5 tons CO2e/yr" },
                      { id: "vegetarian", label: "Vegetarian", desc: "No meat, but consumes dairy products and eggs.", em: "~1.7 tons CO2e/yr" },
                      { id: "pescatarian", label: "Pescatarian", desc: "Primarily vegetarian, but eats seafood.", em: "~2.0 tons CO2e/yr" },
                      { id: "average_meat", label: "Moderate Meat Eater", desc: "Balanced diet including red meat/poultry.", em: "~2.5 tons CO2e/yr" },
                      { id: "heavy_meat", label: "Heavy Meat Eater", desc: "Consumes red meat or poultry with most meals.", em: "~3.3 tons CO2e/yr" }
                    ].map((dietOption) => (
                      <button
                        key={dietOption.id}
                        onClick={() => setFormData({
                          ...formData,
                          diet: { diet_type: dietOption.id }
                        })}
                        className={`w-full flex items-center justify-between p-4 rounded-2xl border text-left transition-all duration-300 ${
                          formData.diet.diet_type === dietOption.id
                            ? "bg-brand-500/10 border-brand-500 text-white"
                            : "bg-dark-900/40 border-white/5 text-dark-300 hover:border-white/10 hover:text-white"
                        }`}
                      >
                        <div>
                          <span className="block text-sm font-bold">{dietOption.label}</span>
                          <span className="block text-xs text-dark-400 mt-0.5">{dietOption.desc}</span>
                        </div>
                        <span className="text-xxs px-2.5 py-1 bg-white/5 border border-white/5 text-dark-400 rounded-md">
                          {dietOption.em}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Consumption & Habits */}
            {step === 4 && (
              <div className="space-y-6 animate-fade-in">
                <h3 className="text-lg font-semibold text-white">Consumption & Waste Management</h3>

                {/* Shopping Spend */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label className="text-xs text-dark-300 font-semibold uppercase tracking-wider">Monthly Discretionary Shopping Spend</label>
                    <span className="text-xs text-brand-400 font-bold">${formData.consumption.monthly_shopping_spend}</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="1500" 
                    step="50"
                    value={formData.consumption.monthly_shopping_spend}
                    onChange={(e) => setFormData({
                      ...formData,
                      consumption: { ...formData.consumption, monthly_shopping_spend: Number(e.target.value) }
                    })}
                    className="w-full accent-brand-500 cursor-pointer bg-dark-900 rounded-lg appearance-none h-1.5"
                  />
                  <span className="text-[10px] text-dark-500 block">
                    Spend on clothes, electronics, appliances, and luxury consumer goods.
                  </span>
                </div>

                {/* Recycling Habits */}
                <div className="space-y-2">
                  <label className="text-xs text-dark-300 font-semibold uppercase tracking-wider block">Recycling Practices</label>
                  <div className="grid grid-cols-3 gap-3">
                    {["never", "sometimes", "always"].map((habit) => (
                      <button
                        key={habit}
                        type="button"
                        onClick={() => setFormData({
                          ...formData,
                          consumption: { ...formData.consumption, recycle_habits: habit }
                        })}
                        className={`py-3 px-4 rounded-xl border text-center text-xs font-semibold capitalize transition-all duration-300 ${
                          formData.consumption.recycle_habits === habit
                            ? "bg-brand-500/10 border-brand-500 text-white"
                            : "bg-dark-900/40 border-white/5 text-dark-400 hover:text-white"
                        }`}
                      >
                        {habit}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Composting Habits */}
                <div className="space-y-2">
                  <label className="text-xs text-dark-300 font-semibold uppercase tracking-wider block">Food Composting Practices</label>
                  <div className="grid grid-cols-3 gap-3">
                    {["never", "sometimes", "always"].map((habit) => (
                      <button
                        key={habit}
                        type="button"
                        onClick={() => setFormData({
                          ...formData,
                          consumption: { ...formData.consumption, compost_habits: habit }
                        })}
                        className={`py-3 px-4 rounded-xl border text-center text-xs font-semibold capitalize transition-all duration-300 ${
                          formData.consumption.compost_habits === habit
                            ? "bg-brand-500/10 border-brand-500 text-white"
                            : "bg-dark-900/40 border-white/5 text-dark-400 hover:text-white"
                        }`}
                      >
                        {habit}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Controls */}
          <div className="flex justify-between items-center border-t border-white/5 pt-6">
            <button
              onClick={handleBack}
              disabled={step === 1}
              className={`flex items-center space-x-2 text-sm font-semibold px-5 py-2.5 rounded-xl border border-white/5 bg-white/5 transition-all ${
                step === 1
                  ? "opacity-30 cursor-not-allowed text-dark-500"
                  : "text-dark-100 hover:bg-white/10 hover:text-white"
              }`}
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>

            {step < totalSteps ? (
              <button
                onClick={handleNext}
                className="flex items-center space-x-2 text-sm font-bold bg-brand-600 hover:bg-brand-500 text-white px-6 py-2.5 rounded-xl shadow-lg shadow-brand-600/15"
              >
                <span>Next</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="flex items-center space-x-2 text-sm font-bold bg-brand-600 hover:bg-brand-500 text-white px-6 py-2.5 rounded-xl shadow-lg shadow-brand-600/20 disabled:opacity-50"
              >
                {isLoading ? (
                  <span>Analyzing...</span>
                ) : (
                  <>
                    <span>Submit & View Results</span>
                    <CheckCircle className="h-4 w-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Sidebar Info & Dynamic Estimate */}
        <div className="space-y-6">
          {/* Dynamic Estimate Widget */}
          <div className="glass-panel rounded-3xl p-6 border border-white/5 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 h-16 w-16 bg-brand-500/10 rounded-full blur-xl" />
            <h3 className="text-sm font-semibold text-dark-300 uppercase tracking-wider mb-2">Footprint Estimate</h3>
            
            <div className="my-4">
              <span className="text-5xl font-extrabold text-white font-display">
                {calculateLiveEstimate()}
              </span>
              <span className="text-sm text-dark-400 block mt-1 font-semibold">Tons CO2e / year</span>
            </div>

            <div className="w-full bg-dark-900 border border-white/5 rounded-2xl py-3 px-4 mt-6">
              <p className="text-xs text-dark-400">
                This is a live approximation. Your final verified score and comparison will be detailed in the Dashboard.
              </p>
            </div>
          </div>

          {/* Quick Context Card */}
          <div className="glass-panel rounded-3xl p-6 border border-white/5 space-y-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-brand-400" />
              <span>Carbon Factors Used</span>
            </h4>
            <ul className="text-xs text-dark-300 space-y-2.5 list-disc pl-4 leading-relaxed">
              <li>Transport emissions include aircraft high altitude warming effects.</li>
              <li>Renewable electricity inputs lower home grid carbon coefficients.</li>
              <li>Diet emissions incorporate methane/land-use indices.</li>
              <li>Recycling counts as upstream resource footprint reduction.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
