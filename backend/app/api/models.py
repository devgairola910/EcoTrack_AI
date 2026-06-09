from pydantic import BaseModel, Field, field_validator
from typing import List, Dict, Optional

class TransportInput(BaseModel):
    vehicle_type: str = Field(..., description="petrol, diesel, hybrid, electric, or none")
    annual_mileage_km: float = Field(0.0, ge=0)
    public_transit_km: float = Field(0.0, ge=0)
    flight_hours_short_haul: float = Field(0.0, ge=0)
    flight_hours_long_haul: float = Field(0.0, ge=0)

class EnergyInput(BaseModel):
    electricity_kwh_monthly: float = Field(0.0, ge=0)
    gas_kwh_monthly: float = Field(0.0, ge=0)
    heating_oil_kwh_monthly: float = Field(0.0, ge=0)
    renewable_energy_pct: float = Field(0.0, ge=0, le=100)

class DietInput(BaseModel):
    diet_type: str = Field(..., description="vegan, vegetarian, pescatarian, average_meat, heavy_meat")

class ConsumptionInput(BaseModel):
    monthly_shopping_spend: float = Field(0.0, ge=0)
    recycle_habits: str = Field(..., description="always, sometimes, never")
    compost_habits: str = Field(..., description="always, sometimes, never")

class AssessmentRequest(BaseModel):
    transport: TransportInput
    energy: EnergyInput
    diet: DietInput
    consumption: ConsumptionInput

class EmissionBreakdown(BaseModel):
    transport: float = Field(..., description="kg CO2e per year")
    energy: float = Field(..., description="kg CO2e per year")
    diet: float = Field(..., description="kg CO2e per year")
    consumption: float = Field(..., description="kg CO2e per year")
    total: float = Field(..., description="kg CO2e per year")

class AssessmentResponse(BaseModel):
    emissions: EmissionBreakdown
    eco_score: int = Field(..., description="Normalized score 0-100")
    profile_type: str = Field(..., description="Eco Champion, Green Conscious, Moderate Emitter, High Carbon Footprint")
    comparison_to_average: float = Field(..., description="Percentage of standard local average footprint (~4800 kg/year)")
    tree_offset_equivalent: int = Field(..., description="Number of trees needed to offset the annual footprint")

class Recommendation(BaseModel):
    id: str
    category: str  # transport, energy, diet, consumption
    title: str
    description: str
    annual_saving_kg: float
    difficulty: str  # easy, medium, hard
    cost: str  # low, medium, high

class RecommendationResponse(BaseModel):
    recommendations: List[Recommendation]

class SimulationRequest(BaseModel):
    current_assessment: AssessmentRequest
    adopted_recommendations: List[str]  # list of Recommendation IDs
    custom_adjustments: Optional[dict] = None

class SignupRequest(BaseModel):
    email: str = Field(
        ...,
        min_length=3,
        max_length=255,
        pattern=r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$",
        description="Unique user email address"
    )
    password: str = Field(
        ...,
        min_length=6,
        max_length=128,
        description="User password (min 6 characters)"
    )
    name: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="User full display name"
    )

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        """
        Verify password strength meets complexity guidelines (upper, lower, digit, special character).
        """
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        special_chars = "!@#$%^&*()-_=+[]{}|;:',.<>?/~`"
        if not any(c in special_chars for c in v):
            raise ValueError("Password must contain at least one special character")
        return v

class LoginRequest(BaseModel):
    email: str = Field(
        ...,
        min_length=3,
        max_length=255,
        pattern=r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$",
        description="User email address"
    )
    password: str = Field(
        ...,
        min_length=6,
        max_length=128,
        description="User password credentials"
    )

class UserResponse(BaseModel):
    id: int
    email: str
    name: str

class AuthResponse(BaseModel):
    token: str
    user: UserResponse

class HistoryLogEntry(BaseModel):
    id: int
    date: str
    total_emissions: float
    eco_score: int
    raw_input: AssessmentRequest

class ActivityLogRequest(BaseModel):
    action_id: str
    points: int
    co2_saved: float
    date: str

class ActivityResponse(BaseModel):
    id: int
    date: str
    action_id: str
    points: int
    co2_saved: float

class ChallengeResponse(BaseModel):
    id: int
    challenge_id: str
    title: str
    description: str
    points: int
    co2_saved: float
    status: str
    start_date: Optional[str] = None
    completed_date: Optional[str] = None

class ChallengeUpdateRequest(BaseModel):
    status: str

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    assessment: Optional[AssessmentRequest] = None

class ChatResponse(BaseModel):
    reply: str
