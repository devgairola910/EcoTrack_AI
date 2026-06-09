# EcoTrack AI — Carbon Footprint Platform

EcoTrack AI is a gamified, AI-powered carbon footprint awareness platform that helps users calculate, simulate, track, and reduce their carbon footprint through personalized insights, daily action logs, weekly eco challenges, and an AI chat assistant.

---

## 🛠️ Technology Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS v4, Recharts, Lucide Icons, Canvas Confetti.
- **Backend**: Python 3.13, FastAPI, SQLite (row-mapped connections), Pydantic schemas.

---

## 📊 Scientific Data & Carbon Formulations ("The Data")

EcoTrack AI uses standardized emissions factors sourced from the **IPCC (Intergovernmental Panel on Climate Change)** and the **EPA (Environmental Protection Agency)** to compute carbon equivalencies (kg CO₂e per year).

### 1. Transportation Carbon Factors
Emissions are calculated annually based on vehicle fuel types, public transit usage, and short-haul/long-haul flights:
$$\text{Transport Emissions (kg CO₂e/yr)} = (\text{Annual Driving km} \times \text{Vehicle Factor}) + (\text{Transit km} \times 0.040) + (\text{Short Flight hours} \times 150) + (\text{Long Flight hours} \times 110)$$

* **Vehicle Factors (per km)**:
  - **Petrol**: $0.192\text{ kg CO₂e}$
  - **Diesel**: $0.171\text{ kg CO₂e}$
  - **Hybrid**: $0.102\text{ kg CO₂e}$
  - **Electric**: $0.045\text{ kg CO₂e}$ (averages national grid charging profiles)
* **Public Transit Factor**: $0.040\text{ kg CO₂e}$ per passenger-km.
* **Aviation Factors (per passenger-hour)**:
  - **Short-Haul (< 3 hours)**: $150.0\text{ kg CO₂e}$ (accounts for heavy takeoff fuel burn)
  - **Long-Haul (>= 3 hours)**: $110.0\text{ kg CO₂e}$

---

### 2. Home Energy Carbon Factors
Home utility consumption is computed monthly and scaled to annual emissions, accounting for renewable offsets:
$$\text{Energy Emissions (kg CO₂e/yr)} = \left[ (\text{Electricity kWh} \times 12) \times 0.475 \times \left(1 - \frac{\text{Renewable \%}}{100}\right) \right] + \left[ (\text{Gas kWh} \times 12) \times 0.185 \right] + \left[ (\text{Oil kWh} \times 12) \times 0.260 \right]$$

* **Electricity Factor**: $0.475\text{ kg CO₂e}$ per kWh.
* **Fossil Gas Factor**: $0.185\text{ kg CO₂e}$ per kWh.
* **Heating Oil Factor**: $0.260\text{ kg CO₂e}$ per kWh.
* **Renewable Offset**: Home solar setups or utility green power plans dynamically deduct electricity emissions (up to $100\%$ offset).

---

### 3. Diet & Consumption Factors
* **Dietary Footprints (base values per year)**:
  - **Heavy Meat Emitter**: $3,300\text{ kg CO₂e}$
  - **Average Meat Emitter**: $2,500\text{ kg CO₂e}$
  - **Pescatarian**: $2,000\text{ kg CO₂e}$
  - **Vegetarian**: $1,700\text{ kg CO₂e}$
  - **Vegan**: $1,500\text{ kg CO₂e}$
* **Composting Discount**: Active food composting reduces the diet base by up to $10\%$ (prevents rotting waste from forming high-potency methane).
* **Shopping Footprint**: scales at $0.12\text{ kg CO₂e}$ per $\$1.00$ spent.
* **Recycling Discount**: Rigorous household recycling of glass, plastics, and aluminum yields a $30\%$ discount (saves manufacturing lifecycle carbon).

---

## 🏆 Gamification & Score Formulations ("The Working")

### 1. Eco Score (1-100 scale)
The Eco Score represents the user's sustainability index. It is calculated using an exponential decay curve of total carbon emissions combined with positive lifestyle multipliers:
$$\text{Base Score} = 100 \times e^{\left(-\frac{\text{Total Emissions}}{9000}\right)}$$

Bonuses are added for proactive sustainable habits (capped at $100$):
* **Vegan Diet**: $+8$ points
* **Vegetarian Diet**: $+5$ points
* **Pescatarian Diet**: $+2$ points
* **Renewable energy >= 80%**: $+7$ points (>= 40%: $+4$ points)
* **Always recycling**: $+5$ points
* **Always composting**: $+3$ points

### 2. Player Levels & XP
Daily actions reward points that contribute to the player's level. Level increases every $100$ points:
$$\text{Player Level} = \left\lfloor \frac{\text{Total Points}}{100} \right\rfloor + 1$$
* **Levels**: 
  - **Level 1**: Eco Novice
  - **Level 2**: Earth Ally
  - **Level 3**: Green Champion
  - **Level 4**: Eco Sentinel
  - **Level 5+**: Carbon Overlord

---

## 💡 Predefined Gamification Data

### Daily Eco-Actions (Activity Tracker)
Users can log everyday actions to save carbon instantly and claim Eco Points:
1. **Commute by Bike/Foot**: $+15\text{ pts}$, $-2.4\text{ kg CO₂}$
2. **Ate Plant-Based Meals**: $+12\text{ pts}$, $-1.9\text{ kg CO₂}$
3. **Used Public Transit**: $+10\text{ pts}$, $-1.5\text{ kg CO₂}$
4. **Short Shower (<5 mins)**: $+8\text{ pts}$, $-0.5\text{ kg CO₂}$
5. **Avoided Single-Use Plastic**: $+5\text{ pts}$, $-0.2\text{ kg CO₂}$
6. **Composted Organic Waste**: $+6\text{ pts}$, $-0.4\text{ kg CO₂}$

### Weekly Eco Challenges
Large-scale commitments that can be accepted and checked off:
* **Zero-Waste Hero**: Avoid all single-use plastics for 5 days. ($+50\text{ pts}$, $-2.5\text{ kg CO₂}$)
* **Pedal Power**: Walk or bike for at least 15 km this week. ($+80\text{ pts}$, $-12.0\text{ kg CO₂}$)
* **Power Down**: Unplug standby electronics before sleeping. ($+40\text{ pts}$, $-3.2\text{ kg CO₂}$)
* **Green Chef**: Prepare 5 consecutive plant-based meals. ($+60\text{ pts}$, $-9.5\text{ kg CO₂}$)

---

## 🚀 How to Run the Project

### Prerequisite
Ensure you have **Python 3.12+** and **Node.js 18+** installed.

### 1. Launch the Backend Server
```bash
# Navigate to backend folder
cd backend

# Create virtual environment and install packages
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Run server (starts on http://127.0.0.1:8000)
chmod +x run.sh
./run.sh
```

### 2. Launch the Frontend
```bash
# Navigate to frontend folder
cd frontend

# Install packages
npm install

# Start development server (runs on http://localhost:5173)
npm run dev
```
*(Note: If the backend is not running, the frontend will automatically load fully-functional local storage fallbacks for scoring, simulator, recommendations, logging tracker, challenges, and the AI coach).*