from app.api.models import TransportInput, EnergyInput, DietInput, ConsumptionInput, EmissionBreakdown

# Carbon factors in kg CO2e per unit
TRANSPORT_FACTORS = {
    "petrol": 0.192,     # kg CO2e per km
    "diesel": 0.171,     # kg CO2e per km
    "hybrid": 0.102,     # kg CO2e per km
    "electric": 0.045,   # kg CO2e per km (electric vehicles in standard grid mix)
    "none": 0.0
}

PUBLIC_TRANSIT_FACTOR = 0.040  # kg CO2e per km
FLIGHT_SHORT_HAUL_FACTOR = 150.0  # kg CO2e per hour (under 3 hours flights)
FLIGHT_LONG_HAUL_FACTOR = 110.0   # kg CO2e per hour (over 3 hours flights)

ENERGY_ELECTRICITY_FACTOR = 0.475  # kg CO2e per kWh (global grid average)
ENERGY_GAS_FACTOR = 0.185          # kg CO2e per kWh
ENERGY_OIL_FACTOR = 0.260          # kg CO2e per kWh

DIET_EMISSIONS = {
    "vegan": 1500.0,         # kg CO2e per year
    "vegetarian": 1700.0,    # kg CO2e per year
    "pescatarian": 2000.0,   # kg CO2e per year
    "average_meat": 2500.0,  # kg CO2e per year
    "heavy_meat": 3300.0     # kg CO2e per year
}

def calculate_transport_emissions(input_data: TransportInput) -> float:
    """
    Calculate annual transportation emissions based on vehicle fuel type, distance, and flight metrics.

    Args:
        input_data (TransportInput): Pydantic input containing driving distance, vehicle type, transit km, and flight hours.

    Returns:
        float: Calculated emissions in kg CO2e.
    """
    vehicle_factor = TRANSPORT_FACTORS.get(input_data.vehicle_type.lower(), 0.0)
    vehicle_emissions = input_data.annual_mileage_km * vehicle_factor
    transit_emissions = input_data.public_transit_km * PUBLIC_TRANSIT_FACTOR
    flight_emissions = (
        input_data.flight_hours_short_haul * FLIGHT_SHORT_HAUL_FACTOR +
        input_data.flight_hours_long_haul * FLIGHT_LONG_HAUL_FACTOR
    )
    return round(vehicle_emissions + transit_emissions + flight_emissions, 2)

def calculate_energy_emissions(input_data: EnergyInput) -> float:
    """
    Calculate annual residential utility energy emissions scaling monthly kWh numbers.

    Args:
        input_data (EnergyInput): Pydantic input containing gas usage, electric consumption, heating oil, and solar generation %.

    Returns:
        float: Calculated emissions in kg CO2e.
    """
    # Scale from monthly to annual
    elec_annual = input_data.electricity_kwh_monthly * 12
    gas_annual = input_data.gas_kwh_monthly * 12
    oil_annual = input_data.heating_oil_kwh_monthly * 12
    
    # Apply renewable energy offset for electricity
    elec_emissions = elec_annual * ENERGY_ELECTRICITY_FACTOR * (1.0 - input_data.renewable_energy_pct / 100.0)
    gas_emissions = gas_annual * ENERGY_GAS_FACTOR
    oil_emissions = oil_annual * ENERGY_OIL_FACTOR
    
    return round(elec_emissions + gas_emissions + oil_emissions, 2)

def calculate_diet_emissions(input_data: DietInput, compost_habit: str = "never") -> float:
    """
    Calculate annual diet emissions based on food type and composting deductions.

    Args:
        input_data (DietInput): Pydantic diet details (e.g. vegan, heavy meat).
        compost_habit (str): Composting frequency ("always", "sometimes", "never").

    Returns:
        float: Calculated emissions in kg CO2e.
    """
    base_diet = DIET_EMISSIONS.get(input_data.diet_type.lower(), 2500.0)
    
    # Composting reduces organic food waste impact
    compost_discount = 0.0
    if compost_habit.lower() == "always":
        compost_discount = 0.10
    elif compost_habit.lower() == "sometimes":
        compost_discount = 0.05
        
    return round(base_diet * (1.0 - compost_discount), 2)

def calculate_consumption_emissions(input_data: ConsumptionInput) -> float:
    """
    Calculate annual consumer goods consumption emissions with recycling deductions.

    Args:
        input_data (ConsumptionInput): Pydantic purchases spend and recycling frequency details.

    Returns:
        float: Calculated emissions in kg CO2e.
    """
    # Standard translation: $1 monthly spend = ~1.44 kg CO2e per year (0.12 kg/month)
    base_emissions = input_data.monthly_shopping_spend * 12 * 0.12
    
    # Recycling reduces waste carbon contribution
    recycle_discount = 0.0
    if input_data.recycle_habits.lower() == "always":
        recycle_discount = 0.30
    elif input_data.recycle_habits.lower() == "sometimes":
        recycle_discount = 0.10
        
    return round(base_emissions * (1.0 - recycle_discount), 2)

def calculate_total_emissions(
    transport: TransportInput,
    energy: EnergyInput,
    diet: DietInput,
    consumption: ConsumptionInput
) -> EmissionBreakdown:
    """
    Calculate total carbon footprint footprint breakdown from all sub-categories.

    Args:
        transport (TransportInput): Transportation details.
        energy (EnergyInput): Utilities details.
        diet (DietInput): Diet selection details.
        consumption (ConsumptionInput): Shopping habits details.

    Returns:
        EmissionBreakdown: Sub-category emissions and grand total value.
    """
    t_em = calculate_transport_emissions(transport)
    e_em = calculate_energy_emissions(energy)
    d_em = calculate_diet_emissions(diet, consumption.compost_habits)
    c_em = calculate_consumption_emissions(consumption)
    
    total = round(t_em + e_em + d_em + c_em, 2)
    
    return EmissionBreakdown(
        transport=t_em,
        energy=e_em,
        diet=d_em,
        consumption=c_em,
        total=total
    )
