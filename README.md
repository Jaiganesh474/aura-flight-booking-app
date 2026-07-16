# Aura Airways - Premium Full-Stack Airline Booking System

Aura Airways is an enterprise-quality **Modular Monolith** Airline Booking & Reservation Platform. It features a modern React frontend inspired by elite carriers (Qatar Airways, Emirates) and a robust Java Spring Boot backend utilizing Spring Security, JWT tokens, JPA, H2/MySQL fallbacks, and a Google Gemini 1.5 Flash AI Engine integration.

---

## Relational Architecture

The database structure is seeded dynamically at launch:
- **Airports**: Mumbai (`BOM`), Delhi (`DEL`), Chennai (`MAA`), Bengaluru (`BLR`).
- **Airlines & Fleets**: Air India (`AI`), IndiGo (`6E`), Akasa Air (`QP`) with custom aircraft grids.
- **Dynamic Seats Map**: 15 rows of seats (Business, Premium Economy, Economy) auto-created for all flight instances.
- **Coupon System**: `FLY20` (20% off) and `SUPER50` (50% off) coded for checkout logic.

---

## Key Features

1. **AI Chatbot & Smart Search (Google Gemini Integration)**:
   - Integrated with **Google Gemini 1.5 Flash API** to answer queries regarding baggage rules, schedules, cancellations, and cheapest recommendations dynamically.
   - Fallback Heuristics rule engine is active if the Gemini API key is not configured.
   - Example: *"I need a morning flight from Chennai to Mumbai under rs 6000."*
2. **Light Mode as Default & Dark Mode Toggle**:
   - The application defaults to a clean, bright, modern Light Mode.
   - Toggle button in the navbar (Sun/Moon icon) allows seamless transition into Dark Mode.
3. **Dynamic Pricing & Seat Fuselage**: Interactive SVG fuselage layout displaying seat categories. Automatically calculates Base + Tax + Fuel + GST - Coupon.
4. **Admin Dashboard (Super Admin & Airline Admin)**:
   - Aggregated financial metrics and daily bookings charts powered by Recharts.
   - **Launch Flights**: Dynamic flight route additions with auto-generated booking seat charts.
   - Status controls (Schedule, Delay, Cancel) supported for both `ROLE_AIRLINE_ADMIN` and `ROLE_SUPER_ADMIN`.
5. **Saved Traveler Profiles**: Allows saving passport details and nationality under profile tabs.

---

## Future Roadmap: True AI + ML Flight Recommendation System

While the current application utilizes a robust rule-based recommendation engine powered by generative AI (Google Gemini), the future roadmap includes transitioning to a **Machine Learning-driven Personalized Ranking System**. 

### Implementation Stages:
1. **Data Collection & Preprocessing**: Tracking user interactions (searches, clicks, bookings, cancellations) across the React frontend to build a comprehensive historical dataset.
2. **Feature Engineering**: Extracting key behavioral features such as preferred departure times, price sensitivity, cabin class preferences, and airline loyalty.
3. **Model Training (Random Forest)**: We plan to use a **Random Forest** algorithm for personalized flight ranking. It is highly effective for this tabular dataset as it captures non-linear user patterns (e.g., users who prefer cheap flights but only on mornings) and ranks flights based on their probability of being booked.
4. **Microservice Integration**: A Python (FastAPI/Flask) microservice will host the trained Scikit-learn model, communicating with the Spring Boot backend to predict booking probabilities and sort flights dynamically for the active user.

---

## Tech Stack

### Backend
- **Core**: Java 21, Spring Boot 3, Maven
- **Security**: Spring Security 6, JWT, BCrypt
- **Database**: H2 Database (In-Memory, out of the box), MySQL driver available
- **API Doc**: Swagger/OpenAPI 3 (`springdoc-openapi-starter-webmvc-ui`)

### Frontend
- **Core**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS v4, Material UI (MUI Icons)
- **State & Data**: AppContext, Axios, React Query
- **Charts & Animation**: Recharts, Framer Motion, Lucide Icons

---

## Setup & Running Locally

### Prerequisites
- Java 21 JDK
- Maven 3.x
- Node.js (v18+) & npm

### Running the Backend
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Configure your Google Gemini API Key. You can set it as an environment variable or edit the property in `src/main/resources/application.properties`:
   ```bash
   # In bash/powershell:
   $env:GEMINI_API_KEY="YOUR_ACTUAL_GEMINI_API_KEY"
   ```
3. Compile and run:
   ```bash
   mvn spring-boot:run
   ```
4. The server starts on port `8080`.
   - **Swagger API Docs**: [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html)
   - **H2 DB Console**: [http://localhost:8080/h2-console](http://localhost:8080/h2-console) (JDBC URL: `jdbc:h2:mem:airlinedb`, User: `sa`, Pass: `password`)

### Running the Frontend
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Run the Vite development server:
   ```bash
   npm run dev
   ```
3. Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Default Accounts (Credentials)

Use these seeded sandboxed credentials to test user role permissions:

| Username | Password | Role | Features |
| :--- | :--- | :--- | :--- |
| **passenger** | `password` | `ROLE_PASSENGER` | Book flight, lock seats, profile settings, PNR tickets |
| **admin** | `password` | `ROLE_AIRLINE_ADMIN` | Change flight status, monitor logs, launch flight schedules |
| **superadmin** | `password` | `ROLE_SUPER_ADMIN` | Full admin capabilities + flight additions |
