# SkyShield

> [!TIP]
> **Important:** If nothing is visible upon visiting the Vercel deployment, please wait **1-2 minutes**. The backend on Render may need a moment to spin up from a cold start.

---

## 📍 Project Status: Delhi Focus
Currently, SkyShield is operational for **Delhi-NCR only**. This localized focus allows for higher accuracy in predictive modeling and sensor integration. We are working toward scaling the platform to cover all major Indian metros and industrial corridors in the near future.

> [!NOTE]
> **Authentication Status:** Full user registration and personalized login functionality are currently in development. To explore the personalized dashboard features, the platform currently uses a **pre-configured Test User account** by default.

### 📺 Project Overview
[**Watch the Explainer Video**](https://drive.google.com/file/d/1ch2cw6SIDz0Z7CwDOcwNCVVhgQ58M9eH/view?usp=sharing)

---

## Air Pollution in India
* **Urban Smog:** Rapid urbanization and vehicular density in cities like Delhi, Mumbai, and Kolkata lead to hazardous levels of particulate matter (PM2.5) and other pollutants.
* **Agricultural Practices:** Seasonal post-harvest stubble burning in northern states contributes significantly to atmospheric haze that blankets the Indo-Gangetic Plain.
* **Industrial Emissions:** Industrial clusters across the country are major sources of sulphur dioxide ($SO_2$) and nitrogen oxides ($NO_x$), which are key precursors to smog and acid rain.
* **Public Health Emergency:** The World Health Organization (WHO) consistently ranks Indian cities among the most polluted globally, leading to a high incidence of respiratory illnesses and reduced life expectancy.

---

## The Solution: SkyShield

SkyShield is a cloud-native platform that transforms raw atmospheric data into actionable intelligence through holistic data fusion and user-centric personalization.

### Key Features:

* **Holistic Air Quality Insights:** Integrates ISRO satellite data with CPCB/SAFAR ground sensors and IMD weather data for a unified, comprehensive view of air quality.
* **Predictive Intelligence:** Leverages AI/ML to forecast air quality 48-72 hours in advance, enabling authorities to issue proactive warnings and mitigation strategies.
* **Personalized Air Risk Map:** Moves beyond generic AQI to provide tailored exposure predictions for individuals (based on health sensitivities) and communities, guiding daily decisions like school closures or travel advisories.
* **Dynamic Pollution & Hotspot Mapping:** Interactive maps visualize pollution movement, identify emission hotspots in real-time, and overlay local landmarks for spatial context.

---

## 📊 Data Sources

### 1. Satellite Data (Remote Sensing)
* **ISRO INSAT-3D/3DR**: Specifically using `3RIMG_L2G_AOD` (Aerosol Optical Depth) and `3RIMG_L2B_FOG` products.
* **Copernicus Sentinel-5P**: For high-resolution trace gas monitoring ($NO_2$, $SO_2$, $O_3$).

### 2. Ground-Level Data
* **CPCB (Central Pollution Control Board)**: Real-time API feeds for live station-based monitoring.
* **SAFAR**: Specialized air quality and weather data for major Indian metros.

### 3. Meteorological Data
* **IMD & Open-Meteo**: Fetching wind speed, direction, and humidity to model how pollution disperses across a region.

---

## 🛠️ Tech Stack

* **Frontend**: React.js, Tailwind CSS, Leaflet.js (Mapping)
* **Backend**: Flask, Python (Data Processing)
* **ML Engine**: TensorFlow/PyTorch for air quality forecasting
* **Database**: PostgreSQL, PostGIS

---

## Getting Started

1.  **Clone the repository**:
    ```bash
    git clone [https://github.com/HimanshuKabra01/skyshield.git](https://github.com/HimanshuKabra01/skyshield.git)
    cd skyshield
    ```

2.  **Set up the Backend**:
    * Create and activate a virtual environment.
    * Install the Python dependencies:
        ```bash
        pip install -r requirements.txt
        ```
    * Create a `.env` file in the root directory to manage environment variables.

3.  **Set up the Frontend**:
    * Navigate to the frontend directory:
        ```bash
        cd frontend
        ```
    * Install the Node.js dependencies:
        ```bash
        npm install
        ```

4.  **Run the application**:
    * **Frontend**: Start the Vite development server:
        ```bash
        npm run dev
        ```
    * **Backend**: Start the Flask server:
        ```bash
        python backend/app.py
        ```
