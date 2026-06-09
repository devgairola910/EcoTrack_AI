from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

from app.api.models import (
    AssessmentRequest,
    AssessmentResponse,
    EmissionBreakdown,
    RecommendationResponse,
    SimulationRequest
)
from app.services.calculator import calculate_total_emissions
from app.services.assessment import perform_user_assessment, calculate_eco_score, determine_profile_type
from app.services.recommender import generate_recommendations

app = FastAPI(
    title="EcoTrack AI API",
    description="Backend calculations, assessments, and AI recommendations for carbon footprints.",
    version="1.0.0"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the exact domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ScoreRequest(BaseModel):
    emissions: EmissionBreakdown
    assessment: AssessmentRequest

class SimulationResponse(BaseModel):
    original_emissions: EmissionBreakdown
    simulated_emissions: EmissionBreakdown
    original_eco_score: int
    simulated_eco_score: int
    saved_co2_kg: float
    trees_saved: int
    new_profile_type: str

@app.get("/")
def read_root():
    return {"status": "online", "message": "EcoTrack AI Backend Service is running."}

@app.post("/api/calculate", response_model=EmissionBreakdown)
def calculate_footprint(request: AssessmentRequest):
    try:
        emissions = calculate_total_emissions(
            request.transport,
            request.energy,
            request.diet,
            request.consumption
        )
        return emissions
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/assessment", response_model=AssessmentResponse)
def get_user_assessment(request: AssessmentRequest):
    try:
        assessment = perform_user_assessment(request)
        return assessment
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/score")
def get_eco_score(request: ScoreRequest):
    try:
        score = calculate_eco_score(request.emissions, request.assessment)
        return {"eco_score": score}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/recommendations", response_model=RecommendationResponse)
def get_recommendations(request: AssessmentRequest):
    try:
        recs = generate_recommendations(request)
        return RecommendationResponse(recommendations=recs)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/simulate", response_model=SimulationResponse)
def run_simulation(request: SimulationRequest):
    try:
        # Calculate base values
        original_assessment = perform_user_assessment(request.current_assessment)
        original_em = original_assessment.emissions
        original_score = original_assessment.eco_score
        
        # We start with original emissions and simulate adjustments
        # Adjust based on adopted recommendations
        recs = generate_recommendations(request.current_assessment)
        adopted_ids = set(request.adopted_recommendations)
        
        total_saving = 0.0
        
        # Apply specific reductions per recommendation
        # Create an adjusted version of the assessment
        adjusted_transport = request.current_assessment.transport.model_copy()
        adjusted_energy = request.current_assessment.energy.model_copy()
        adjusted_diet = request.current_assessment.diet.model_copy()
        adjusted_consumption = request.current_assessment.consumption.model_copy()
        
        for rec in recs:
            if rec.id in adopted_ids:
                if rec.id == "switch_to_ev":
                    adjusted_transport.vehicle_type = "electric"
                elif rec.id == "public_transit_once_a_week":
                    # Reduce petrol/diesel/hybrid driving by 20% (1 day out of 5 commutes)
                    adjusted_transport.annual_mileage_km = adjusted_transport.annual_mileage_km * 0.8
                    adjusted_transport.public_transit_km += request.current_assessment.transport.annual_mileage_km * 0.2
                elif rec.id == "reduce_flights":
                    adjusted_transport.flight_hours_short_haul = adjusted_transport.flight_hours_short_haul * 0.67
                    adjusted_transport.flight_hours_long_haul = adjusted_transport.flight_hours_long_haul * 0.67
                elif rec.id == "solar_panels":
                    adjusted_energy.renewable_energy_pct = 100.0
                elif rec.id == "led_lighting":
                    adjusted_energy.electricity_kwh_monthly = adjusted_energy.electricity_kwh_monthly * 0.85
                elif rec.id == "heat_pump":
                    adjusted_energy.gas_kwh_monthly = 0.0
                    adjusted_energy.heating_oil_kwh_monthly = 0.0
                elif rec.id == "meatless_mondays":
                    if adjusted_diet.diet_type == "heavy_meat":
                        adjusted_diet.diet_type = "average_meat"
                    elif adjusted_diet.diet_type == "average_meat":
                        adjusted_diet.diet_type = "pescatarian"
                elif rec.id == "plant_based_diet":
                    adjusted_diet.diet_type = "vegetarian"
                elif rec.id == "composting":
                    adjusted_consumption.compost_habits = "always"
                elif rec.id == "recycle_more":
                    adjusted_consumption.recycle_habits = "always"
                elif rec.id == "conscious_shopping":
                    adjusted_consumption.monthly_shopping_spend = adjusted_consumption.monthly_shopping_spend * 0.80

        # Run custom adjustments from sliders (if any)
        if request.custom_adjustments:
            adj = request.custom_adjustments
            if "vehicle_type" in adj:
                adjusted_transport.vehicle_type = adj["vehicle_type"]
            if "annual_mileage_km" in adj:
                adjusted_transport.annual_mileage_km = adj["annual_mileage_km"]
            if "public_transit_km" in adj:
                adjusted_transport.public_transit_km = adj["public_transit_km"]
            if "flight_hours_short_haul" in adj:
                adjusted_transport.flight_hours_short_haul = adj["flight_hours_short_haul"]
            if "flight_hours_long_haul" in adj:
                adjusted_transport.flight_hours_long_haul = adj["flight_hours_long_haul"]
            if "electricity_kwh_monthly" in adj:
                adjusted_energy.electricity_kwh_monthly = adj["electricity_kwh_monthly"]
            if "gas_kwh_monthly" in adj:
                adjusted_energy.gas_kwh_monthly = adj["gas_kwh_monthly"]
            if "heating_oil_kwh_monthly" in adj:
                adjusted_energy.heating_oil_kwh_monthly = adj["heating_oil_kwh_monthly"]
            if "renewable_energy_pct" in adj:
                adjusted_energy.renewable_energy_pct = adj["renewable_energy_pct"]
            if "diet_type" in adj:
                adjusted_diet.diet_type = adj["diet_type"]
            if "monthly_shopping_spend" in adj:
                adjusted_consumption.monthly_shopping_spend = adj["monthly_shopping_spend"]
            if "recycle_habits" in adj:
                adjusted_consumption.recycle_habits = adj["recycle_habits"]
            if "compost_habits" in adj:
                adjusted_consumption.compost_habits = adj["compost_habits"]

        # Recompute total emissions and score
        simulated_assessment = perform_user_assessment(
            AssessmentRequest(
                transport=adjusted_transport,
                energy=adjusted_energy,
                diet=adjusted_diet,
                consumption=adjusted_consumption
            )
        )
        
        simulated_em = simulated_assessment.emissions
        simulated_score = simulated_assessment.eco_score
        
        saved_co2 = max(0.0, round(original_em.total - simulated_em.total, 2))
        trees_saved = int(saved_co2 // 22.0)
        
        return SimulationResponse(
            original_emissions=original_em,
            simulated_emissions=simulated_em,
            original_eco_score=original_score,
            simulated_eco_score=simulated_score,
            saved_co2_kg=saved_co2,
            trees_saved=trees_saved,
            new_profile_type=simulated_assessment.profile_type
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
