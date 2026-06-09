import { Leaf, ShieldAlert, Calculator, BarChart3, LineChart, CheckSquare } from "lucide-react";
import { useEco } from "../context/EcoContext";

interface LandingPageProps {
  setCurrentPage: (page: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ setCurrentPage }) => {
  const { isCalculated } = useEco();

  const features = [
    {
      icon: <Calculator className="h-6 w-6 text-brand-400" />,
      title: "Carbon Calculator",
      desc: "An intuitive multi-step quiz analyzing transport, electricity, dietary choices, and spending habits.",
      actionLabel: "Calculate Footprint",
      page: "calculator"
    },
    {
      icon: <BarChart3 className="h-6 w-6 text-emerald-400" />,
      title: "Impact Dashboard",
      desc: "Visual breakdowns and metric comparisons explaining how your emissions stack up against local averages.",
      actionLabel: "View Analytics",
      page: "dashboard",
      locked: !isCalculated
    },
    {
      icon: <LineChart className="h-6 w-6 text-blue-400" />,
      title: "Sustainability Simulator",
      desc: "Drag-and-drop what-if sliders to simulate green behavior shifts (like getting an EV or going vegetarian).",
      actionLabel: "Simulate Adjustments",
      page: "simulator",
      locked: !isCalculated
    },
    {
      icon: <CheckSquare className="h-6 w-6 text-yellow-400" />,
      title: "Smart Recommendations",
      desc: "Tailored environmental strategies classified by offset strength, complexity, and setup cost.",
      actionLabel: "Inspect Actions",
      page: "recommendations",
      locked: !isCalculated
    }
  ];

  return (
    <div className="relative isolate px-6 pt-10 pb-20 lg:px-8 bg-gradient-glow min-h-[85vh]">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
        <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-brand-600 to-emerald-400 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
      </div>

      <div className="mx-auto max-w-7xl">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto space-y-8 pt-6 pb-16">
          <div className="inline-flex items-center space-x-2 bg-brand-500/10 border border-brand-500/20 text-brand-400 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider animate-bounce">
            <Leaf className="h-4 w-4" />
            <span>AI-Driven Climate Intelligence</span>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl font-display leading-[1.15]">
            Gamify Your Green Journey with <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-emerald-300">Eco Intelligence</span>
          </h1>

          <p className="text-lg text-dark-300 leading-relaxed max-w-2xl mx-auto">
            Unlock eco-levels, track daily action streaks, complete weekly sustainability challenges, and coach with AI to reach Paris Climate Agreement targets.
          </p>

          <div className="flex items-center justify-center gap-x-6">
            <button
              onClick={() => setCurrentPage("calculator")}
              className="bg-brand-600 hover:bg-brand-500 text-white font-bold px-8 py-4 rounded-2xl text-base shadow-xl shadow-brand-600/20 hover:shadow-brand-500/30 transition-all duration-300 hover:scale-[1.02] transform"
            >
              {isCalculated ? "Recalculate Footprint" : "Start Free Assessment"}
            </button>
            
            {isCalculated && (
              <button
                onClick={() => setCurrentPage("dashboard")}
                className="text-white hover:text-brand-400 border border-white/10 hover:border-brand-500/30 bg-white/5 hover:bg-white/10 px-8 py-4 rounded-2xl text-base font-semibold transition-all duration-300"
              >
                Go to Dashboard
              </button>
            )}
          </div>
        </div>

        {/* Carbon Awareness Banner */}
        <div className="glass-panel rounded-3xl p-8 mb-16 max-w-4xl mx-auto border border-white/5 relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-brand-500/10 blur-2xl" />
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-brand-500/10 rounded-2xl border border-brand-500/20">
                <ShieldAlert className="h-6 w-6 text-brand-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">Why 2.0 Tons?</h3>
                <p className="text-sm text-dark-300 max-w-md">
                  The current global average footprint per capita is **4.8 tons of CO2e** per year. To halt climate change, scientists estimate we must drop the personal footprint target below **2.0 tons** by 2050.
                </p>
              </div>
            </div>
            <div className="text-center bg-dark-900 border border-white/5 rounded-2xl p-4 min-w-[150px]">
              <span className="block text-xs text-dark-400 uppercase font-semibold">Global Target</span>
              <span className="text-3xl font-extrabold text-brand-400">2.0t</span>
              <span className="block text-xxs text-dark-500">CO2e / yr</span>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold sm:text-3xl">Explore the Toolkit</h2>
            <p className="text-sm text-dark-400">Track and lower emissions step-by-step with state-of-the-art climate models</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feat, idx) => (
              <div
                key={idx}
                className="glass-panel glass-panel-hover rounded-2xl p-6 flex flex-col justify-between h-72 relative"
              >
                <div className="space-y-4">
                  <div className="inline-flex p-3 bg-white/5 border border-white/10 rounded-xl">
                    {feat.icon}
                  </div>
                  <h3 className="text-lg font-bold text-white">{feat.title}</h3>
                  <p className="text-xs text-dark-300 leading-relaxed">{feat.desc}</p>
                </div>
                
                <div className="pt-4">
                  {feat.locked ? (
                    <button
                      disabled
                      className="w-full bg-dark-900 border border-white/5 text-dark-600 cursor-not-allowed text-xs font-semibold py-2.5 rounded-xl"
                    >
                      Quiz Required
                    </button>
                  ) : (
                    <button
                      onClick={() => setCurrentPage(feat.page)}
                      className="w-full bg-brand-500/10 border border-brand-500/20 hover:bg-brand-500/20 text-brand-400 text-xs font-semibold py-2.5 rounded-xl transition-all duration-300"
                    >
                      {feat.actionLabel}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
