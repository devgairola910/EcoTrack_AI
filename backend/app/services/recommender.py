from typing import List
from app.api.models import AssessmentRequest, Recommendation
from app.services.calculator import (
    TRANSPORT_FACTORS,
    DIET_EMISSIONS,
    calculate_transport_emissions,
    calculate_energy_emissions,
    calculate_diet_emissions,
    calculate_consumption_emissions
)

def generate_recommendations(request: AssessmentRequest) -> List[Recommendation]:
    """
    Generate personalized carbon reduction recommendations based on user assessment inputs.

    Analyzes transportation driving mileage, aviation flights, home utility profiles,
    dietary choices, and recycling habits to recommend the highest-impact actions.
    Recommendations are sorted in descending order of annual CO2e savings.

    Args:
        request (AssessmentRequest): User input questionnaire parameters.

    Returns:
        List[Recommendation]: List of personalized and calculated carbon offset actions.
    """
    recs = []
    
    # Calculate emissions per category to customize calculations
    t_em = calculate_transport_emissions(request.transport)
    e_em = calculate_energy_emissions(request.energy)
    d_em = calculate_diet_emissions(request.diet, request.consumption.compost_habits)
    c_em = calculate_consumption_emissions(request.consumption)
    
    # --- TRANSPORTATION ---
    if request.transport.vehicle_type in ["petrol", "diesel", "hybrid"]:
        v_factor = TRANSPORT_FACTORS.get(request.transport.vehicle_type, 0.192)
        ev_factor = TRANSPORT_FACTORS["electric"]
        ev_saving = request.transport.annual_mileage_km * (v_factor - ev_factor)
        
        if ev_saving > 100:
            recs.append(Recommendation(
                id="switch_to_ev",
                category="transport",
                title="Switch to an Electric Vehicle",
                description=f"Replacing your {request.transport.vehicle_type} vehicle with an electric vehicle will slash your commute emissions by ~{round((v_factor-ev_factor)/v_factor * 100)}%, saving approximately {round(ev_saving)} kg CO2e annually.",
                annual_saving_kg=round(ev_saving, 2),
                difficulty="hard",
                cost="high"
            ))
            
        transit_saving = (request.transport.annual_mileage_km / 5.0) * (v_factor - 0.040)
        if transit_saving > 50:
            recs.append(Recommendation(
                id="public_transit_once_a_week",
                category="transport",
                title="Commute via Transit Once a Week",
                description=f"Using public transit (bus or train) instead of your vehicle just 1 day per work week reduces annual emissions by around {round(transit_saving)} kg CO2e.",
                annual_saving_kg=round(transit_saving, 2),
                difficulty="easy",
                cost="low"
            ))

    if (request.transport.flight_hours_short_haul + request.transport.flight_hours_long_haul) > 0:
        total_flight_em = (
            request.transport.flight_hours_short_haul * 150.0 +
            request.transport.flight_hours_long_haul * 110.0
        )
        flight_saving = total_flight_em * 0.33  # Reductions by 1/3
        recs.append(Recommendation(
            id="reduce_flights",
            category="transport",
            title="Reduce Air Travel by 1/3",
            description="Replace short-haul business flights with virtual meetings or choose train options where possible. Flight carbon has high radiative forcing effects at altitude.",
            annual_saving_kg=round(flight_saving, 2),
            difficulty="medium",
            cost="low"
        ))

    # --- ENERGY ---
    if request.energy.electricity_kwh_monthly > 0 and request.energy.renewable_energy_pct < 100:
        elec_annual_em = (request.energy.electricity_kwh_monthly * 12) * 0.475 * (1.0 - request.energy.renewable_energy_pct / 100.0)
        solar_saving = elec_annual_em
        
        if solar_saving > 100:
            recs.append(Recommendation(
                id="solar_panels",
                category="energy",
                title="Install Solar or Buy Green Power",
                description="Subscribe to a community solar project or purchase green power from your utility. This neutralizes your electricity emissions completely.",
                annual_saving_kg=round(solar_saving, 2),
                difficulty="medium",
                cost="medium"
            ))

        led_saving = (request.energy.electricity_kwh_monthly * 12 * 0.475) * 0.15
        recs.append(Recommendation(
            id="led_lighting",
            category="energy",
            title="Energy Efficiency Retrofit",
            description="Upgrade to 100% LED lighting and use smart power strips to eliminate phantom loads. This reduces average household power bills by 10-15%.",
            annual_saving_kg=round(led_saving, 2),
            difficulty="easy",
            cost="low"
        ))

    if request.energy.gas_kwh_monthly > 0 or request.energy.heating_oil_kwh_monthly > 0:
        heat_saving = (request.energy.gas_kwh_monthly * 12 * 0.185 * 0.5) + (request.energy.heating_oil_kwh_monthly * 12 * 0.260 * 0.6)
        if heat_saving > 100:
            recs.append(Recommendation(
                id="heat_pump",
                category="energy",
                title="Install a High-Efficiency Heat Pump",
                description="Replacing a conventional gas or heating oil system with an electric heat pump cuts carbon footprints significantly and operates at 300%+ thermal efficiency.",
                annual_saving_kg=round(heat_saving, 2),
                difficulty="hard",
                cost="high"
            ))

    # --- DIET ---
    if request.diet.diet_type.lower() in ["heavy_meat", "average_meat"]:
        diet_base = DIET_EMISSIONS[request.diet.diet_type.lower()]
        veg_saving = diet_base - DIET_EMISSIONS["vegetarian"]
        vegan_saving = diet_base - DIET_EMISSIONS["vegan"]
        
        recs.append(Recommendation(
            id="meatless_mondays",
            category="diet",
            title="Adopt Meatless Mondays",
            description="Cutting out meat just one day a week is a low-effort way to reduce animal-related food carbon, land use, and methane emissions.",
            annual_saving_kg=round(diet_base * (1.0 / 7.0) * 0.35, 2), # approx ~15-20% reduction of diet emissions for that day
            difficulty="easy",
            cost="low"
        ))
        
        recs.append(Recommendation(
            id="plant_based_diet",
            category="diet",
            title="Transition to Vegetarian/Vegan Diet",
            description="Transitioning to a primarily plant-based diet is the single most powerful action for diet emissions, potentially saving over 1,000 kg CO2e.",
            annual_saving_kg=round(veg_saving, 2),
            difficulty="medium",
            cost="low"
        ))

    if request.consumption.compost_habits.lower() in ["sometimes", "never"]:
        compost_potential = DIET_EMISSIONS.get(request.diet.diet_type.lower(), 2500.0) * 0.10
        recs.append(Recommendation(
            id="composting",
            category="diet",
            title="Start Composting Kitchen Scraps",
            description="Composting food waste in a bin avoids anaerobic landfill decomposition, which releases methane (a highly dangerous GHG).",
            annual_saving_kg=round(compost_potential, 2),
            difficulty="easy",
            cost="low"
        ))

    # --- CONSUMPTION / WASTE ---
    if request.consumption.recycle_habits.lower() in ["sometimes", "never"]:
        recycle_potential = c_em * 0.25
        recs.append(Recommendation(
            id="recycle_more",
            category="consumption",
            title="Rigorous Household Recycling",
            description="Ensure 100% of recyclable plastic, glass, aluminum, and cardboard is recycled. This reduces the footprint of manufacturing raw consumer goods.",
            annual_saving_kg=round(recycle_potential if recycle_potential > 20 else 80.0, 2),
            difficulty="easy",
            cost="low"
        ))

    if request.consumption.monthly_shopping_spend > 150:
        conscious_shopping_saving = c_em * 0.20
        recs.append(Recommendation(
            id="conscious_shopping",
            category="consumption",
            title="Choose Second-Hand or Buy Less",
            description="Adopt a 'circular economy' approach: buy second-hand clothing, repair electronics, and reduce impulse shopping. This cuts consumer manufacturing carbon.",
            annual_saving_kg=round(conscious_shopping_saving, 2),
            difficulty="medium",
            cost="low"
        ))

    # Sort recommendations by emission savings in descending order
    recs.sort(key=lambda r: r.annual_saving_kg, reverse=True)
    return recs
