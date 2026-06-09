import React from "react";
import { 
  Award, ShieldCheck, TreePine, AlertTriangle, ArrowRight,
  TrendingDown, Globe
} from "lucide-react";
import { useEco } from "../context/EcoContext";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line
} from "recharts";

interface DashboardProps {
  setCurrentPage: (page: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ setCurrentPage }) => {
  const { assessmentResult, assessmentInput, history } = useEco();

  if (!assessmentResult) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-4">
        <AlertTriangle className="h-12 w-12 text-yellow-400" />
        <h2 className="text-xl font-bold text-white">No Assessment Data Found</h2>
        <p className="text-sm text-dark-400">Please complete the Carbon Calculator assessment first.</p>
        <button
          onClick={() => setCurrentPage("calculator")}
          className="bg-brand-600 hover:bg-brand-500 text-white px-6 py-2.5 rounded-xl font-semibold transition"
        >
          Go to Calculator
        </button>
      </div>
    );
  }

  const { emissions, eco_score, profile_type, comparison_to_average, tree_offset_equivalent } = assessmentResult;

  // Chart 1 Data: Breakdown
  const breakdownData = [
    { name: "Transport", value: emissions.transport, color: "#f59e0b" }, // Amber
    { name: "Home Energy", value: emissions.energy, color: "#f97316" }, // Orange
    { name: "Diet & Food", value: emissions.diet, color: "#10b981" }, // Emerald
    { name: "Consumption", value: emissions.consumption, color: "#8b5cf6" } // Violet
  ].filter(item => item.value > 0);

  // Chart 2 Data: Comparisons (converting to Tons)
  const userTons = Math.round((emissions.total / 1000) * 10) / 10;
  const comparisonData = [
    { name: "You", Footprint: userTons, fill: "#10b981" },
    { name: "World Avg", Footprint: 4.8, fill: "#475569" },
    { name: "US Average", Footprint: 16.0, fill: "#e11d48" },
    { name: "Target Limit", Footprint: 2.0, fill: "#3b82f6" }
  ];

  // Dynamic Badges based on choices
  const badges = [];
  if (emissions.transport < 1200) {
    badges.push({
      title: "Green Commuter",
      desc: "Very low transport emissions. Walking, cycling, or EV expert!",
      color: "from-amber-500/20 to-yellow-500/10 border-amber-500/30 text-amber-300"
    });
  }
  if (["vegan", "vegetarian"].includes(assessmentInput.diet.diet_type)) {
    badges.push({
      title: "Plant Champion",
      desc: "Vegetarian or vegan diet avoiding high carbon livestock farming.",
      color: "from-emerald-500/20 to-green-500/10 border-emerald-500/30 text-emerald-300"
    });
  }
  if (assessmentInput.energy.renewable_energy_pct >= 60) {
    badges.push({
      title: "Clean Powerhouse",
      desc: "Sourcing over 60% of household energy from renewable electricity.",
      color: "from-orange-500/20 to-yellow-500/10 border-orange-500/30 text-orange-300"
    });
  }
  if (eco_score >= 75) {
    badges.push({
      title: "Climate Protector",
      desc: "Earned an Eco Score higher than 75. Outstanding footprint optimization!",
      color: "from-brand-500/20 to-teal-500/10 border-brand-500/30 text-brand-300"
    });
  }

  // Custom tooltips for Recharts
  const renderPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const pct = Math.round((data.value / emissions.total) * 100);
      return (
        <div className="bg-dark-900 border border-white/10 rounded-xl p-3 text-xs shadow-xl">
          <span className="font-bold text-white block mb-1">{data.name}</span>
          <span className="text-dark-300 block">{data.value.toLocaleString()} kg CO2e ({pct}%)</span>
        </div>
      );
    }
    return null;
  };

  const renderBarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-dark-900 border border-white/10 rounded-xl p-3 text-xs shadow-xl">
          <span className="font-bold text-white block mb-1">{data.name}</span>
          <span className="text-dark-300 block">{data.Footprint} Tons CO2e / year</span>
        </div>
      );
    }
    return null;
  };

  // Chart 3 Data: Historical Trends (converting to Tons)
  const historyData = history ? history.map(entry => ({
    date: entry.date,
    Footprint: Math.round((entry.total_emissions / 1000) * 10) / 10,
    Score: entry.eco_score
  })) : [];

  const renderLineTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-dark-900 border border-white/10 rounded-xl p-3 text-xs shadow-xl">
          <span className="font-bold text-white block mb-1">{data.date}</span>
          <span className="text-brand-400 block font-semibold">Eco Score: {data.Score}</span>
          <span className="text-dark-300 block mt-0.5">{data.Footprint} Tons CO2e / year</span>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 bg-gradient-glow min-h-[85vh]">
      {/* Upper Profile Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        
        {/* Total Emissions */}
        <div className="glass-panel rounded-3xl p-6 border border-white/5 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 h-16 w-16 bg-amber-500/10 rounded-full blur-xl" />
          <span className="text-xs text-dark-400 font-semibold uppercase tracking-wider block">Carbon Footprint</span>
          <div className="my-4">
            <span className="text-4xl font-extrabold text-white font-display">
              {userTons}
            </span>
            <span className="text-sm text-dark-300 ml-1.5 font-semibold">Tons CO2e / yr</span>
          </div>
          <div className="flex items-center text-xs text-dark-400">
            <Globe className="h-4 w-4 mr-1.5 text-dark-500" />
            <span>Net total emissions breakdown</span>
          </div>
        </div>

        {/* Eco Score */}
        <div className="glass-panel rounded-3xl p-6 border border-white/5 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 h-16 w-16 bg-brand-500/10 rounded-full blur-xl" />
          <span className="text-xs text-dark-400 font-semibold uppercase tracking-wider block">Eco Score</span>
          <div className="my-4">
            <span className="text-5xl font-extrabold text-brand-400 font-display">
              {eco_score}
            </span>
            <span className="text-xs text-dark-400 block mt-1">Profile: <strong className="text-white">{profile_type}</strong></span>
          </div>
          <div className="flex items-center text-xs text-dark-400">
            <Award className="h-4 w-4 mr-1.5 text-brand-500" />
            <span>Score out of 100 baseline</span>
          </div>
        </div>

        {/* Tree Offset */}
        <div className="glass-panel rounded-3xl p-6 border border-white/5 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 h-16 w-16 bg-emerald-500/10 rounded-full blur-xl" />
          <span className="text-xs text-dark-400 font-semibold uppercase tracking-wider block">Tree Offset Equivalent</span>
          <div className="my-4">
            <span className="text-4xl font-extrabold text-white font-display">
              {tree_offset_equivalent}
            </span>
            <span className="text-sm text-dark-300 ml-1.5 font-semibold">mature trees</span>
          </div>
          <div className="flex items-center text-xs text-dark-400">
            <TreePine className="h-4 w-4 mr-1.5 text-emerald-500" />
            <span>Required annually to neutralize</span>
          </div>
        </div>

        {/* Comparison to Average */}
        <div className="glass-panel rounded-3xl p-6 border border-white/5 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 h-16 w-16 bg-rose-500/10 rounded-full blur-xl" />
          <span className="text-xs text-dark-400 font-semibold uppercase tracking-wider block">Global Comparison</span>
          <div className="my-4">
            <span className={`text-3xl font-extrabold block font-display ${comparison_to_average <= 100 ? 'text-emerald-400' : 'text-rose-500'}`}>
              {comparison_to_average}%
            </span>
            <span className="text-xs text-dark-400 block mt-1">
              {comparison_to_average <= 100 ? "Below" : "Above"} global average per capita
            </span>
          </div>
          <div className="flex items-center text-xs text-dark-400">
            <TrendingDown className={`h-4 w-4 mr-1.5 ${comparison_to_average <= 100 ? 'text-emerald-500' : 'text-rose-500'}`} />
            <span>Benchmark: 4.8t CO2e</span>
          </div>
        </div>
      </div>

      {/* Visual Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        
        {/* Pie Chart: Emissions Breakdown */}
        <div className="glass-panel rounded-3xl p-6 border border-white/5 flex flex-col min-h-[400px]">
          <h3 className="text-base font-semibold text-white mb-6 uppercase tracking-wider">Carbon Footprint Breakdown</h3>
          <div className="flex-1 flex flex-col md:flex-row items-center justify-around">
            <div className="w-full h-64 md:w-3/5">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={breakdownData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {breakdownData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={renderPieTooltip} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Custom Legend */}
            <div className="flex flex-col space-y-3 mt-4 md:mt-0 md:w-2/5">
              {breakdownData.map((item, idx) => (
                <div key={idx} className="flex items-center space-x-2.5">
                  <span className="h-3.5 w-3.5 rounded-full block border border-white/10" style={{ backgroundColor: item.color }} />
                  <div>
                    <span className="block text-xs font-bold text-white">{item.name}</span>
                    <span className="block text-xxs text-dark-400">
                      {Math.round((item.value / 1000) * 10) / 10} t ({Math.round(item.value / emissions.total * 100)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bar Chart: Global Comparisons */}
        <div className="glass-panel rounded-3xl p-6 border border-white/5 flex flex-col min-h-[400px]">
          <h3 className="text-base font-semibold text-white mb-6 uppercase tracking-wider">Carbon Benchmarking (Tons CO2e)</h3>
          <div className="flex-1 w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip content={renderBarTooltip} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
                <Bar dataKey="Footprint" radius={[10, 10, 0, 0]}>
                  {comparisonData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="text-xxs text-dark-500 leading-relaxed mt-4 bg-dark-900 border border-white/5 rounded-2xl p-4">
            * Benchmark values display your calculated yearly carbon totals compared alongside the Paris Agreement targets (2.0 Tons limit) and national average values.
          </div>
        </div>
      </div>

      {/* Historical Progress Tracking & Trends */}
      {history && history.length > 0 && (
        <div className="glass-panel rounded-3xl p-6 border border-white/5 mb-10 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-base font-semibold text-white uppercase tracking-wider flex items-center space-x-2">
                <TrendingDown className="h-5 w-5 text-brand-400" />
                <span>Historical Progress Trends</span>
              </h3>
              <p className="text-xs text-dark-400 mt-1">Compare your current footprint vs previous records and track percentage improvements.</p>
            </div>

            {/* Improvement stats */}
            {history.length > 1 && (
              <div className="bg-brand-500/10 border border-brand-500/20 text-brand-400 rounded-2xl py-1.5 px-4 text-xs font-semibold">
                {(() => {
                  const first = history[0].total_emissions;
                  const current = emissions.total;
                  const pct = Math.round(((first - current) / first) * 100);
                  if (pct > 0) {
                    return `🎉 Total reduction: ${pct}% since ${history[0].date}`;
                  } else if (pct < 0) {
                    return `⚠️ Footprint increased: ${Math.abs(pct)}% since ${history[0].date}`;
                  } else {
                    return `Stable emissions trend`;
                  }
                })()}
              </div>
            )}
          </div>

          {/* Line Chart of footprint over time */}
          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip content={renderLineTooltip} />
                <Line 
                  type="monotone" 
                  dataKey="Footprint" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  activeDot={{ r: 6 }} 
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Badges and Call to Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Badges Earned */}
        <div className="lg:col-span-2 glass-panel rounded-3xl p-6 border border-white/5">
          <h3 className="text-base font-semibold text-white mb-6 uppercase tracking-wider flex items-center space-x-2">
            <Award className="h-5 w-5 text-brand-400" />
            <span>Milestones & Badges</span>
          </h3>
          
          {badges.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {badges.map((badge, idx) => (
                <div 
                  key={idx} 
                  className={`bg-gradient-to-r ${badge.color} border rounded-2xl p-4 flex items-start space-x-3.5`}
                >
                  <div className="p-2 bg-white/5 rounded-xl border border-white/10 mt-0.5">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{badge.title}</h4>
                    <p className="text-xxs opacity-80 mt-1 leading-relaxed">{badge.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 bg-dark-900 border border-white/5 rounded-2xl">
              <span className="text-dark-500 block mb-2 text-sm">No badges unlocked yet</span>
              <p className="text-xs text-dark-400 max-w-sm mx-auto">
                Implement reductions in the Simulator or recommendations list to lower emissions and unlock carbon milestones!
              </p>
            </div>
          )}
        </div>

        {/* CTA to Actions */}
        <div className="glass-panel rounded-3xl p-6 border border-white/5 flex flex-col justify-between min-h-[200px] relative overflow-hidden">
          <div className="absolute top-0 right-0 h-16 w-16 bg-blue-500/10 rounded-full blur-xl" />
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-2">Reduce Your Carbon</h3>
            <p className="text-xs text-dark-300 leading-relaxed">
              Explore your personalized recommendation plan or interact with the simulator to inspect live improvements to your score.
            </p>
          </div>
          <div className="space-y-3 pt-6">
            <button
              onClick={() => setCurrentPage("simulator")}
              className="w-full flex items-center justify-between bg-brand-600 hover:bg-brand-500 text-white font-bold px-5 py-3 rounded-xl text-xs transition duration-300"
            >
              <span>Go to simulator</span>
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentPage("recommendations")}
              className="w-full flex items-center justify-between bg-white/5 hover:bg-white/10 text-brand-400 border border-brand-500/20 px-5 py-3 rounded-xl text-xs font-semibold transition duration-300"
            >
              <span>Inspect recommendations</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
