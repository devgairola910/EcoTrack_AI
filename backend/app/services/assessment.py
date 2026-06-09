import math
from app.api.models import AssessmentRequest, EmissionBreakdown, AssessmentResponse
from app.services.calculator import calculate_total_emissions

# Baseline average carbon footprint is roughly 4,800 kg CO2e/year per person (Global average)
# US average is about 16,000 kg, EU is about 7,000 kg. We use 4,800 kg as our baseline comparison.
GLOBAL_AVERAGE_EMISSIONS = 4800.0

def calculate_eco_score(emissions: EmissionBreakdown, request: AssessmentRequest) -> int:
    """
    Calculate the user's ecological score on a scale of 1 to 100 based on emissions and habits.

    Uses an exponential decay curve against the emissions total, and grants bonus points
    for green habits (diet type, renewable energy percentage, recycling, composting).

    Args:
        emissions (EmissionBreakdown): The calculated emission levels for all categories.
        request (AssessmentRequest): The original user assessment request containing habit choices.

    Returns:
        int: An ecological score between 1 and 100 inclusive.
    """
    total = emissions.total
    
    # Calculate a base score using an exponential decay curve.
    # A total of 2,000 kg gives ~80, 4,800 kg gives ~55, and 12,000 kg gives ~20.
    base_score = 100 * math.exp(-total / 9000.0)
    
    # Add bonus points for positive habits, capped so we don't exceed 100
    bonus = 0
    if request.diet.diet_type.lower() == "vegan":
        bonus += 8
    elif request.diet.diet_type.lower() == "vegetarian":
        bonus += 5
    elif request.diet.diet_type.lower() == "pescatarian":
        bonus += 2
        
    if request.energy.renewable_energy_pct >= 80:
        bonus += 7
    elif request.energy.renewable_energy_pct >= 40:
        bonus += 4
        
    if request.consumption.recycle_habits.lower() == "always":
        bonus += 5
    elif request.consumption.recycle_habits.lower() == "sometimes":
        bonus += 2
        
    if request.consumption.compost_habits.lower() == "always":
        bonus += 3
        
    final_score = int(base_score + bonus)
    return max(1, min(100, final_score))

def determine_profile_type(total_emissions: float) -> str:
    """
    Categorize the user's environmental profile based on total annual CO2e emissions.

    Args:
        total_emissions (float): Total annual emissions in kg CO2e.

    Returns:
        str: Category title (e.g., "Eco Champion", "Green Conscious", "Moderate Emitter", "High Carbon Footprint").
    """
    if total_emissions < 2500.0:
        return "Eco Champion"
    elif total_emissions < 5000.0:
        return "Green Conscious"
    elif total_emissions < 9000.0:
        return "Moderate Emitter"
    else:
        return "High Carbon Footprint"

def perform_user_assessment(request: AssessmentRequest) -> AssessmentResponse:
    """
    Evaluate the user's carbon footprint questionnaire inputs to generate a full profile.

    Computes total category-by-category emissions, determines an ecological score,
    classifies the profile, and compares results against global averages and tree offset metrics.

    Args:
        request (AssessmentRequest): The multi-category input parameters from the user.

    Returns:
        AssessmentResponse: Complete assessment breakdown, eco score, and sustainability comparison.
    """
    emissions = calculate_total_emissions(
        request.transport,
        request.energy,
        request.diet,
        request.consumption
    )
    
    eco_score = calculate_eco_score(emissions, request)
    profile_type = determine_profile_type(emissions.total)
    
    # Compare user emissions to the global average
    comparison = round((emissions.total / GLOBAL_AVERAGE_EMISSIONS) * 100, 1)
    
    # One mature tree absorbs ~22 kg of CO2 per year
    tree_offset = int(math.ceil(emissions.total / 22.0))
    
    return AssessmentResponse(
        emissions=emissions,
        eco_score=eco_score,
        profile_type=profile_type,
        comparison_to_average=comparison,
        tree_offset_equivalent=tree_offset
    )
