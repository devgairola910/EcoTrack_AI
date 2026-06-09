import base64
from collections import defaultdict
import hashlib
import hmac
import os
import time
from fastapi import FastAPI, HTTPException, Header, Depends, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

from app.api.models import (
    AssessmentRequest,
    AssessmentResponse,
    EmissionBreakdown,
    RecommendationResponse,
    SimulationRequest,
    SignupRequest,
    LoginRequest,
    AuthResponse,
    UserResponse,
    HistoryLogEntry,
    ActivityLogRequest,
    ActivityResponse,
    ChallengeResponse,
    ChallengeUpdateRequest,
    ChatMessage,
    ChatRequest,
    ChatResponse
)
from app.services.calculator import (
    calculate_total_emissions,
    TRANSPORT_FACTORS,
    DIET_EMISSIONS
)
from app.services.assessment import perform_user_assessment, calculate_eco_score, determine_profile_type
from app.services.recommender import generate_recommendations
from app.services.database import (
    init_db,
    create_user,
    verify_user,
    get_user_by_id,
    add_history_entry,
    get_user_history,
    clear_user_history,
    get_activities,
    add_activity,
    delete_activity,
    clear_activities,
    get_user_challenges,
    update_user_challenge_status,
    clear_user_challenges
)

app = FastAPI(
    title="EcoTrack AI API",
    description="Backend calculations, assessments, and AI recommendations for carbon footprints.",
    version="1.0.0"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        os.getenv("PRODUCTION_DOMAIN", "https://eco-track-ai-devgairola910s-projects.vercel.app")
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting configuration (e.g., max 100 requests per 60 seconds per IP)
RATE_LIMIT_WINDOW_SECONDS = 60
RATE_LIMIT_MAX_REQUESTS = 100
ip_request_history = defaultdict(list)

# Max payload content size: 2MB (2 * 1024 * 1024 bytes)
MAX_CONTENT_LENGTH_BYTES = 2 * 1024 * 1024

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    """
    Prevent brute-force and Denial-of-Service (DoS) attacks by rate-limiting client IPs.
    """
    client_ip = request.client.host if request.client else "unknown"
    current_time = time.time()
    
    # Filter out timestamps older than the sliding window
    ip_request_history[client_ip] = [
        t for t in ip_request_history[client_ip]
        if current_time - t < RATE_LIMIT_WINDOW_SECONDS
    ]
    
    if len(ip_request_history[client_ip]) >= RATE_LIMIT_MAX_REQUESTS:
        return JSONResponse(
            status_code=429,
            content={"detail": "Too many requests. Please try again later."}
        )
        
    ip_request_history[client_ip].append(current_time)
    return await call_next(request)

@app.middleware("http")
async def payload_size_limit_middleware(request: Request, call_next):
    """
    Defend against memory exhaustion (DoS) by enforcing a maximum size on request payloads.
    """
    content_length = request.headers.get("Content-Length")
    if content_length:
        try:
            if int(content_length) > MAX_CONTENT_LENGTH_BYTES:
                return JSONResponse(
                    status_code=413,
                    content={"detail": "Request payload too large (max 2MB)."}
                )
        except ValueError:
            return JSONResponse(
                status_code=400,
                content={"detail": "Invalid Content-Length header."}
            )
    return await call_next(request)

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """
    HTTP middleware to append defense-in-depth security headers to every response.
    """
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    # Allow local/production assets while preventing injection framing
    response.headers["Content-Security-Policy"] = (
        "default-src 'self' https://cdn.jsdelivr.net; "
        "frame-ancestors 'none';"
    )
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

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
    """
    Get the API service status.
    """
    return {"status": "online", "message": "EcoTrack AI Backend Service is running."}

@app.post("/api/calculate", response_model=EmissionBreakdown)
def calculate_footprint(request: AssessmentRequest):
    """
    Calculate the carbon footprint footprint breakdown (Transport, Energy, Diet, Consumption).
    """
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
    """
    Evaluate the carbon footprint inputs to return emissions, scores, profiles, and equivalents.
    """
    try:
        assessment = perform_user_assessment(request)
        return assessment
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/score")
def get_eco_score(request: ScoreRequest):
    """
    Calculate the ecological rating score (1-100) based on emissions and habits.
    """
    try:
        score = calculate_eco_score(request.emissions, request.assessment)
        return {"eco_score": score}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/recommendations", response_model=RecommendationResponse)
def get_recommendations(request: AssessmentRequest):
    """
    Get customized carbon offset actions tailored to the user's questionnaire parameters.
    """
    try:
        recs = generate_recommendations(request)
        return RecommendationResponse(recommendations=recs)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/simulate", response_model=SimulationResponse)
def run_simulation(request: SimulationRequest):
    """
    Simulate lifestyle carbon reductions based on custom inputs and adopted actions.
    """
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

# --- AUTHENTICATION & HISTORY INTEGRATION ---

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "ecotrack_ai_secret_signature_key_salt_token")

def generate_auth_token(user_id: int, email: str) -> str:
    """
    Generate a cryptographically secure signed authentication token.

    Uses HMAC-SHA256 signature to guarantee payload integrity and prevent length-extension attacks.

    Args:
        user_id (int): Primary key ID of the user.
        email (str): Email of the authenticated session.

    Returns:
        str: Base64-encoded token containing the payload and signature.
    """
    payload = f"{user_id}:{email}"
    sig = hmac.new(SECRET_KEY.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()
    token_str = f"{payload}:{sig}"
    return base64.b64encode(token_str.encode("utf-8")).decode("utf-8")

def verify_auth_token(token: str) -> Optional[int]:
    """
    Verify the cryptographically signed token and extract the user ID.

    Employs constant-time string comparison to defend against timing analysis side channels.

    Args:
        token (str): Base64-encoded token from headers.

    Returns:
        Optional[int]: User ID if valid, or None if expired/tampered with.
    """
    try:
        token_str = base64.b64decode(token.encode("utf-8")).decode("utf-8")
        parts = token_str.split(":")
        if len(parts) != 3:
            return None
        user_id, email, sig = parts[0], parts[1], parts[2]
        payload = f"{user_id}:{email}"
        expected_sig = hmac.new(SECRET_KEY.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()
        if hmac.compare_digest(sig.encode("utf-8"), expected_sig.encode("utf-8")):
            return int(user_id)
    except Exception:
        pass
    return None

def get_current_user_id(authorization: Optional[str] = Header(None)) -> int:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authentication token")
    token = authorization.split(" ")[1]
    user_id = verify_auth_token(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Session expired or invalid signature")
    return user_id

@app.on_event("startup")
def startup_event():
    init_db()

@app.post("/api/auth/signup", response_model=AuthResponse)
def auth_signup(request: SignupRequest):
    """
    Register a new user account with validated email and password credentials.
    """
    user_id = create_user(request.email, request.password, request.name)
    if user_id is None:
        raise HTTPException(status_code=400, detail="Email address is already registered")
    token = generate_auth_token(user_id, request.email)
    return AuthResponse(
        token=token,
        user=UserResponse(id=user_id, email=request.email, name=request.name)
    )

@app.post("/api/auth/login", response_model=AuthResponse)
def auth_login(request: LoginRequest):
    """
    Authenticate user login credentials and return an active session token.
    """
    user = verify_user(request.email, request.password)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid email or password credentials")
    token = generate_auth_token(user["id"], user["email"])
    return AuthResponse(
        token=token,
        user=UserResponse(id=user["id"], email=user["email"], name=user["name"])
    )

@app.get("/api/auth/me", response_model=UserResponse)
def get_current_user_profile(user_id: int = Depends(get_current_user_id)):
    """
    Retrieve the profile details of the currently authenticated user.
    """
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(id=user["id"], email=user["email"], name=user["name"])

@app.get("/api/user/history", response_model=List[HistoryLogEntry])
def fetch_user_history_logs(user_id: int = Depends(get_current_user_id)):
    """
    Fetch all archived carbon footprint calculation logs for the active user.
    """
    rows = get_user_history(user_id)
    logs = []
    for r in rows:
        logs.append(HistoryLogEntry(
            id=r["id"],
            date=r["date"],
            total_emissions=r["total_emissions"],
            eco_score=r["eco_score"],
            raw_input=AssessmentRequest(**r["raw_input"])
        ))
    return logs

class HistorySaveRequest(BaseModel):
    date: str
    total_emissions: float
    eco_score: int
    raw_input: AssessmentRequest

@app.post("/api/user/history")
def save_user_history_log(request: HistorySaveRequest, user_id: int = Depends(get_current_user_id)):
    """
    Save a new carbon footprint calculation snapshot entry to the user's history log.
    """
    entry_id = add_history_entry(
        user_id,
        request.date,
        request.total_emissions,
        request.eco_score,
        request.raw_input.model_dump()
    )
    return {"status": "success", "entry_id": entry_id}

@app.delete("/api/user/history")
def delete_user_history_logs(user_id: int = Depends(get_current_user_id)):
    """
    Delete all footprint calculation log history records for the current user.
    """
    clear_user_history(user_id)
    return {"status": "success", "message": "History cleared"}

# --- ACTIVITY LOGGER ENDPOINTS ---

@app.get("/api/user/activities", response_model=List[ActivityResponse])
def fetch_user_activities(user_id: int = Depends(get_current_user_id)):
    """
    Retrieve all logged daily carbon-saving activities for the active user.
    """
    rows = get_activities(user_id)
    return [
        ActivityResponse(
            id=r["id"],
            date=r["date"],
            action_id=r["action_id"],
            points=r["points"],
            co2_saved=r["co2_saved"]
        ) for r in rows
    ]

@app.post("/api/user/activities")
def log_user_activity(request: ActivityLogRequest, user_id: int = Depends(get_current_user_id)):
    """
    Log a new daily eco-friendly action and earn experience points.
    """
    act_id = add_activity(
        user_id,
        request.date,
        request.action_id,
        request.points,
        request.co2_saved
    )
    return {"status": "success", "activity_id": act_id}

@app.delete("/api/user/activities/{activity_id}")
def delete_user_activity(activity_id: int, user_id: int = Depends(get_current_user_id)):
    """
    Delete a specific logged activity by ID.
    """
    delete_activity(user_id, activity_id)
    return {"status": "success"}

@app.delete("/api/user/activities")
def clear_user_activities(user_id: int = Depends(get_current_user_id)):
    """
    Delete all daily activities recorded by the user.
    """
    clear_activities(user_id)
    return {"status": "success"}

# --- WEEKLY CHALLENGES ENDPOINTS ---

@app.get("/api/user/challenges", response_model=List[ChallengeResponse])
def fetch_user_challenges(user_id: int = Depends(get_current_user_id)):
    """
    Retrieve the current status of all weekly eco-challenges for the active user.
    """
    rows = get_user_challenges(user_id)
    return [
        ChallengeResponse(
            id=r["id"],
            challenge_id=r["challenge_id"],
            title=r["title"],
            description=r["description"],
            points=r["points"],
            co2_saved=r["co2_saved"],
            status=r["status"],
            start_date=r["start_date"],
            completed_date=r["completed_date"]
        ) for r in rows
    ]

@app.put("/api/user/challenges/{challenge_id}")
def update_challenge_status(challenge_id: str, request: ChallengeUpdateRequest, user_id: int = Depends(get_current_user_id)):
    """
    Update the status (available, active, completed) of a weekly challenge.
    """
    success = update_user_challenge_status(user_id, challenge_id, request.status)
    if not success:
        raise HTTPException(status_code=404, detail="Challenge not found or update failed")
    return {"status": "success"}

@app.delete("/api/user/challenges")
def clear_challenges(user_id: int = Depends(get_current_user_id)):
    """
    Clear all weekly challenges stored for the user, triggering a reseeding of fresh available ones.
    """
    clear_user_challenges(user_id)
    return {"status": "success", "message": "Challenges cleared"}

# --- AI COACH CHAT ENDPOINT ---

@app.post("/api/chat", response_model=ChatResponse)
def handle_chat_assistant(request: ChatRequest):
    """
    Handle carbon coaching conversational queries context-sensitively based on user carbon footprint metrics.
    """
    try:
        if not request.messages:
            return ChatResponse(reply="Hello! I am your EcoTrack carbon coach. How can I help you today?")
            
        last_message = request.messages[-1].content.lower()
        
        # Default fallback context info
        vehicle_type = "petrol"
        mileage = 8000.0
        electricity = 320.0
        diet = "average_meat"
        total_co2 = 5200.0
        eco_score = 65
        profile = "Moderate Emitter"
        
        # Extract assessment variables if present
        if request.assessment:
            try:
                # perform calculation & assessment
                assessment = perform_user_assessment(request.assessment)
                total_co2 = assessment.emissions.total
                eco_score = assessment.eco_score
                profile = assessment.profile_type
                
                vehicle_type = request.assessment.transport.vehicle_type
                mileage = request.assessment.transport.annual_mileage_km
                electricity = request.assessment.energy.electricity_kwh_monthly
                diet = request.assessment.diet.diet_type
            except Exception:
                pass
                
        # Matching Logic
        if any(kw in last_message for kw in ["hello", "hi", "hey", "greetings"]):
            reply = (
                f"Hello! I'm your EcoTrack AI Coach. 🌍\n\n"
                f"Based on your profile, your total annual footprint is **{round(total_co2)} kg CO2e**, placing you in the **{profile}** category (Eco Score: **{eco_score}/100**).\n\n"
                f"What would you like to discuss today? You can ask me about transportation tips, renewable energy, dietary adjustments, or how to claim points in the Activity Tracker!"
            )
        elif any(kw in last_message for kw in ["ev", "electric car", "electric vehicle", "driving", "mileage", "commute", "car"]):
            if vehicle_type in ["petrol", "diesel", "hybrid"]:
                # calculate potential EV savings
                v_factor = TRANSPORT_FACTORS.get(vehicle_type, 0.192)
                ev_factor = TRANSPORT_FACTORS["electric"]
                ev_saving = mileage * (v_factor - ev_factor)
                
                reply = (
                    f"Let's look at your transportation commute! 🚗\n\n"
                    f"You are currently driving a **{vehicle_type}** vehicle with an annual mileage of **{round(mileage)} km**, "
                    f"which releases approximately **{round(mileage * v_factor)} kg CO2e** per year.\n\n"
                    f"💡 **Recommendation**: If you transitioned to an **Electric Vehicle**, your emissions for the same distance would drop to only **{round(mileage * ev_factor)} kg CO2e** (saving you **{round(ev_saving)} kg CO2e** annually!).\n\n"
                    f"Additionally, using public transit just one day a week or walking/cycling for short errands can earn you up to **15 Eco Points** in our Activity Tracker!"
                )
            else:
                reply = (
                    f"Awesome commute habits! 🚲\n\n"
                    f"Your vehicle profile is registered as **{vehicle_type}**, which keeps your transport footprint low. "
                    f"Remember that active transport (cycling, walking) has a **0.0 kg CO2** footprint and earns you **15 Eco Points** daily. "
                    f"Let me know if you want to discuss public transit options or flight emissions!"
                )
        elif any(kw in last_message for kw in ["flight", "plane", "fly", "aviation", "travel"]):
            reply = (
                f"Air travel has a massive warming impact on the atmosphere due to high-altitude radiative forcing. ✈️\n\n"
                f"Every hour on a short-haul flight adds ~150 kg CO2e, and a long-haul flight adds ~110 kg CO2e per passenger.\n\n"
                f"💡 **Coach Advice**: Consider choosing train routes for medium distances, combining business trips, or committing to our **Reduce Air Travel by 1/3** recommendation to help protect the global carbon budget."
            )
        elif any(kw in last_message for kw in ["solar", "electricity", "power", "renewable", "energy", "led"]):
            annual_electricity_em = (electricity * 12) * 0.475
            reply = (
                f"Home energy accounts for a major chunk of residential emissions. ⚡\n\n"
                f"Your profile indicates a monthly electricity usage of **{round(electricity)} kWh**, which accounts for "
                f"about **{round(annual_electricity_em)} kg CO2e** per year (before accounting for solar generation offset).\n\n"
                f"💡 **Action Plan**:\n"
                f"1. **Install Solar Panels** or purchase 100% green power from your utility provider to zero out this footprint.\n"
                f"2. **Retrofit with LEDs** and unplug standby devices to save up to 15% on power consumption instantly. (Unplugging at night completes our 'Power Down' Weekly Challenge for **40 Eco Points**!)."
            )
        elif any(kw in last_message for kw in ["diet", "food", "meat", "vegan", "vegetarian", "beef", "chicken", "eat"]):
            current_diet_em = DIET_EMISSIONS.get(diet.lower(), 2500)
            veg_em = DIET_EMISSIONS["vegetarian"]
            saving = current_diet_em - veg_em
            
            if diet in ["heavy_meat", "average_meat"]:
                reply = (
                    f"Food choice is one of the most effective personal levers for carbon reduction! 🍔\n\n"
                    f"Your diet is registered as **{diet.replace('_', ' ')}**, generating about **{round(current_diet_em)} kg CO2e** annually due to high-emission farming practices (especially beef and dairy).\n\n"
                    f"💡 **Switch Impact**: Transitioning to a **vegetarian diet** would lower your annual emissions to **{round(veg_em)} kg CO2e**, saving you **{round(saving)} kg CO2e**!\n\n"
                    f"Try starting with our **Meatless Mondays** challenge (earns **12 Eco Points** in the Activity Tracker) to ease into plant-based habits."
                )
            else:
                reply = (
                    f"Excellent green food choices! 🥗\n\n"
                    f"Your registered diet is **{diet}**, which is already highly sustainable. Plant-based diets use up to 70% less clean water and land compared to meat-heavy diets.\n\n"
                    f"To make your kitchen even greener, start composting organic food waste to earn **6 Eco Points** daily and prevent anaerobic methane decay in landfills!"
                )
        elif any(kw in last_message for kw in ["recycle", "waste", "plastic", "compost", "garbage", "trash"]):
            reply = (
                f"Managing household waste prevents greenhouse emissions in two ways: avoiding manufacturing raw materials, and preventing landfill methane. ♻️\n\n"
                f"💡 **Green Habits**:\n"
                f"- **Recycle rigorously**: Plastics, glass, and aluminum take up to 90% less energy to recycle than extracting raw inputs.\n"
                f"- **Composting kitchen scraps**: Prevents food rotting into methane. It cuts landfill volume and creates rich soil. Doing this regularly completes our 'Zero-Waste Hero' challenge!"
            )
        elif any(kw in last_message for kw in ["paris", "budget", "target", "limit", "world", "safety"]):
            reply = (
                f"Under the international **Paris Agreement**, climate scientists target keeping global temperature increases below 1.5°C. 🌡️\n\n"
                f"To achieve this, the average personal carbon budget must drop to under **2,000 kg (2.0 Tons) CO2e** per year. Currently, the average person in high-income countries releases over 10,000 kg.\n\n"
                f"Your current footprint is **{round(total_co2)} kg CO2e**, which is {round((total_co2 / 2000) * 100)}% of the target safety budget. Use the **Sustainability Simulator** to adjust your inputs and see how you can reach the 2,000 kg safety line!"
            )
        elif any(kw in last_message for kw in ["score", "points", "level", "challenge", "tracker"]):
            reply = (
                f"EcoTrack AI rewards green actions through our gamified points system! 🏆\n\n"
                f"Your profile has an Eco Score of **{eco_score}/100**. You can increase this by:\n"
                f"1. **Adopting Recommendations** in the recommendations feed (slashes annual footprint estimates).\n"
                f"2. **Logging Daily Actions** in the Activity Tracker (earns Eco Points, e.g., biking commuted gives **15 pts**).\n"
                f"3. **Completing Weekly Challenges** (earns massive points, e.g., 'Pedal Power' gives **80 pts**).\n\n"
                f"Accumulating points increases your Player Level (Novice -> Ally -> Champion -> Sentinel -> Overlord)!"
            )
        else:
            reply = (
                f"I'm here to support your green journey! 🌍\n\n"
                f"Your current Eco Score is **{eco_score}/100** with a footprint of **{round(total_co2)} kg CO2e/year**.\n\n"
                f"Ask me questions like:\n"
                f"- *'How can I lower my car emissions?'*\n"
                f"- *'What diet choices save the most carbon?'*\n"
                f"- *'Why is composting important?'*\n"
                f"- *'What is the Paris Agreement safety budget?'*"
            )
            
        return ChatResponse(reply=reply)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

