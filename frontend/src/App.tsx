import React, { useState } from "react";
import { EcoProvider } from "./context/EcoContext";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { LandingPage } from "./pages/LandingPage";
import { CarbonCalculator } from "./pages/CarbonCalculator";
import { Dashboard } from "./pages/Dashboard";
import { SustainabilitySimulator } from "./pages/SustainabilitySimulator";
import { Recommendations } from "./pages/Recommendations";

const AppContent: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<string>("landing");

  return (
    <div className="flex flex-col min-h-screen bg-dark-950 text-dark-100 font-sans selection:bg-brand-500 selection:text-white">
      {/* Dynamic Navigation Header */}
      <Navbar currentPage={currentPage} setCurrentPage={setCurrentPage} />

      {/* Main Pages Switchboard */}
      <main className="flex-grow">
        {currentPage === "landing" && (
          <LandingPage setCurrentPage={setCurrentPage} />
        )}
        {currentPage === "calculator" && (
          <CarbonCalculator setCurrentPage={setCurrentPage} />
        )}
        {currentPage === "dashboard" && (
          <Dashboard setCurrentPage={setCurrentPage} />
        )}
        {currentPage === "simulator" && (
          <SustainabilitySimulator setCurrentPage={setCurrentPage} />
        )}
        {currentPage === "recommendations" && (
          <Recommendations setCurrentPage={setCurrentPage} />
        )}
      </main>

      {/* Shared Footer */}
      <Footer />
    </div>
  );
};

function App() {
  return (
    <EcoProvider>
      <AppContent />
    </EcoProvider>
  );
}

export default App;
