import React, { useState } from "react";
import { EcoProvider } from "./context/EcoContext";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { LandingPage } from "./pages/LandingPage";
import { CarbonCalculator } from "./pages/CarbonCalculator";
import { Dashboard } from "./pages/Dashboard";
import { SustainabilitySimulator } from "./pages/SustainabilitySimulator";
import { Recommendations } from "./pages/Recommendations";
import { ActivityTracker } from "./pages/ActivityTracker";
import { WeeklyChallenges } from "./pages/WeeklyChallenges";
import { AIChatAssistant } from "./pages/AIChatAssistant";
import { AuthModal } from "./components/AuthModal";

const AppContent: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<string>("landing");
  const [authModalOpen, setAuthModalOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen bg-dark-950 text-dark-100 font-sans selection:bg-brand-500 selection:text-white">
      {/* Dynamic Navigation Header */}
      <Navbar 
        currentPage={currentPage} 
        setCurrentPage={setCurrentPage} 
        onOpenAuth={() => setAuthModalOpen(true)} 
      />

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
        {currentPage === "tracker" && (
          <ActivityTracker setCurrentPage={setCurrentPage} />
        )}
        {currentPage === "challenges" && (
          <WeeklyChallenges setCurrentPage={setCurrentPage} />
        )}
        {currentPage === "chat" && (
          <AIChatAssistant />
        )}
      </main>

      {/* Shared Footer */}
      <Footer />

      {/* Authentication Modal */}
      <AuthModal 
        isOpen={authModalOpen} 
        onClose={() => setAuthModalOpen(false)} 
      />
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
