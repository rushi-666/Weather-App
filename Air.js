import {
  getAirQuality,
  getCityCoordinates,
  getCityFromCoordinates,
} from "./api.js";

// Air Quality State

let airLatitude = null;
let airLongitude = null;
let airCityName = "";

// Get Air Quality

async function loadAirQuality() {
  try {
    if (airLatitude === null || airLongitude === null) {
      return;
    }

    const airData = await getAirQuality(airLatitude, airLongitude);

    updateAirQualityUI(airData);
  } catch (error) {
    console.error("Air quality loading failed:", error);
  }
}

// Update Air Quality UI

function updateAirQualityUI(airData) {
  try {
    const aqiElement = document.getElementById("airAQI");

    const statusElement = document.getElementById("airStatus");

    const pm25Element = document.getElementById("airPM25");

    const pm10Element = document.getElementById("airPM10");

    const ozoneElement = document.getElementById("airOzone");

    const no2Element = document.getElementById("airNO2");

    const so2Element = document.getElementById("airSO2");

    const coElement = document.getElementById("airCO");

    const aqiIndicator = document.getElementById("airAQIIndicator");

    const healthGuidanceElement = document.getElementById("airHealthGuidance");

    const naqi = calculateIndianAQI(airData);

    // AQI

    if (aqiElement && naqi != null) {
      aqiElement.textContent = naqi;
    }

    // AQI Indicator

    if (aqiIndicator && naqi != null) {
      const percentage = (Math.min(500, naqi) / 500) * 100;

      aqiIndicator.style.width = `${percentage}%`;
    }

    // AQI Status

    // NAQI Status

    if (statusElement && naqi != null) {
      statusElement.textContent = getAQIStatus(naqi);

      statusElement.className = `mb-0 fw-bold ${getAQIColorClass(naqi)}`;
    }

    // Health Guidance

    if (healthGuidanceElement && naqi != null) {
      healthGuidanceElement.textContent = getHealthGuidance(naqi);
    }

    // PM2.5

    if (pm25Element && airData.pm25 != null) {
      pm25Element.innerHTML = `${airData.pm25.toFixed(1)}
        <small class="fs-6">
          µg/m³
        </small>`;
    }

    // PM10

    if (pm10Element && airData.pm10 != null) {
      pm10Element.innerHTML = `${airData.pm10.toFixed(1)}
        <small class="fs-6">
          µg/m³
        </small>`;
    }

    // Ozone

    if (ozoneElement && airData.ozone != null) {
      ozoneElement.innerHTML = `${airData.ozone.toFixed(1)}
        <small class="fs-6">
          µg/m³
        </small>`;
    }

    // NO₂

    if (no2Element && airData.nitrogenDioxide != null) {
      no2Element.innerHTML = `${airData.nitrogenDioxide.toFixed(1)}
        <small class="fs-6">
          µg/m³
        </small>`;
    }

    // SO₂

    if (so2Element && airData.sulphurDioxide != null) {
      so2Element.innerHTML = `${airData.sulphurDioxide.toFixed(1)}
        <small class="fs-6">
          µg/m³
        </small>`;
    }

    // CO

    if (coElement && airData.carbonMonoxide != null) {
      coElement.innerHTML = `${airData.carbonMonoxide.toFixed(0)}
        <small class="fs-6">
          µg/m³
        </small>`;
    }
  } catch (error) {
    console.error("Air quality UI update failed:", error);
  }
}

// Calculate Indian AQI

function calculateIndianAQI(data) {
  try {
    const subIndices = [];

    // PM2.5 — µg/m³, 24-hour

    if (data.pm25 != null) {
      subIndices.push(
        calculateSubIndex(
          data.pm25,
          [0, 30, 60, 90, 120, 250],
          [0, 50, 100, 200, 300, 400, 500],
        ),
      );
    }

    // PM10 — µg/m³, 24-hour

    if (data.pm10 != null) {
      subIndices.push(
        calculateSubIndex(
          data.pm10,
          [0, 50, 100, 250, 350, 430],
          [0, 50, 100, 200, 300, 400, 500],
        ),
      );
    }

    // NO2 — µg/m³, 24-hour

    if (data.nitrogenDioxide != null) {
      subIndices.push(
        calculateSubIndex(
          data.nitrogenDioxide,
          [0, 40, 80, 180, 280, 400],
          [0, 50, 100, 200, 300, 400, 500],
        ),
      );
    }

    // SO2 — µg/m³, 24-hour

    if (data.sulphurDioxide != null) {
      subIndices.push(
        calculateSubIndex(
          data.sulphurDioxide,
          [0, 40, 80, 380, 800, 1600],
          [0, 50, 100, 200, 300, 400, 500],
        ),
      );
    }

    // O3 — µg/m³, 8-hour

    if (data.ozone != null) {
      subIndices.push(
        calculateSubIndex(
          data.ozone,
          [0, 50, 100, 168, 208, 748],
          [0, 50, 100, 200, 300, 400, 500],
        ),
      );
    }

    // CO — mg/m³, 8-hour
    //
    // IMPORTANT:
    // Your API currently gives CO in µg/m³.
    // Convert it to mg/m³ first.

    if (data.carbonMonoxide != null) {
      const coMg = data.carbonMonoxide / 1000;

      subIndices.push(
        calculateSubIndex(
          coMg,
          [0, 1, 2, 10, 17, 34],
          [0, 50, 100, 200, 300, 400, 500],
        ),
      );
    }

    if (!subIndices.length) {
      return null;
    }

    return Math.round(Math.max(...subIndices));
  } catch (error) {
    console.error("Indian AQI calculation failed:", error);

    return null;
  }
}

// Calculate AQI Sub Index

function calculateSubIndex(concentration, breakpoints, aqiBreakpoints) {
  try {
    if (concentration == null || concentration < 0) {
      return null;
    }

    // Above the final breakpoint

    if (concentration >= breakpoints[breakpoints.length - 1]) {
      const lastIndex = aqiBreakpoints.length - 1;

      const previousIndex = lastIndex - 1;

      return (
        aqiBreakpoints[lastIndex] +
        ((concentration - breakpoints[previousIndex]) *
          (aqiBreakpoints[lastIndex] - aqiBreakpoints[previousIndex])) /
          (breakpoints[lastIndex] - breakpoints[previousIndex])
      );
    }

    for (let i = 0; i < breakpoints.length - 1; i++) {
      const lower = breakpoints[i];

      const upper = breakpoints[i + 1];

      if (concentration >= lower && concentration < upper) {
        const lowerAQI = aqiBreakpoints[i];

        const upperAQI = aqiBreakpoints[i + 1];

        return (
          ((upperAQI - lowerAQI) / (upper - lower)) * (concentration - lower) +
          lowerAQI
        );
      }
    }

    return null;
  } catch (error) {
    console.error("AQI sub-index calculation failed:", error);

    return null;
  }
}

// AQI Status

function getAQIStatus(aqi) {
  try {
    if (aqi <= 50) {
      return "Good";
    }

    if (aqi <= 100) {
      return "Satisfactory";
    }

    if (aqi <= 200) {
      return "Moderately Polluted";
    }

    if (aqi <= 300) {
      return "Poor";
    }

    if (aqi <= 400) {
      return "Very Poor";
    }

    return "Severe";
  } catch (error) {
    console.error("AQI status calculation failed:", error);

    return "Unknown";
  }
}

// AQI Color

function getAQIColorClass(aqi) {
  try {
    if (aqi <= 50) {
      return "text-success";
    }

    if (aqi <= 100) {
      return "text-warning";
    }

    if (aqi <= 200) {
      return "text-warning";
    }

    if (aqi <= 300) {
      return "text-danger";
    }

    if (aqi <= 400) {
      return "text-danger";
    }

    return "text-danger";
  } catch (error) {
    console.error("AQI color calculation failed:", error);

    return "text-danger";
  }
}

// Health Guidance

function getHealthGuidance(aqi) {
  try {
    if (aqi <= 50) {
      return "Air quality is good. Minimal health impact is expected.";
    }

    if (aqi <= 100) {
      return "Air quality is satisfactory. Sensitive people may experience minor discomfort.";
    }

    if (aqi <= 200) {
      return "Sensitive groups may experience health effects. Reduce prolonged outdoor activity if needed.";
    }

    if (aqi <= 300) {
      return "Everyone may experience health effects. Sensitive groups should reduce prolonged outdoor activity.";
    }

    if (aqi <= 400) {
      return "Health alert. Everyone may experience more serious health effects. Avoid prolonged outdoor exposure.";
    }

    return "Health emergency. Avoid outdoor exposure and follow local health recommendations.";
  } catch (error) {
    console.error("Health guidance calculation failed:", error);

    return "Health guidance is currently unavailable.";
  }
}

// Current Location

try {
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        const latitude = position.coords.latitude;

        const longitude = position.coords.longitude;

        airLatitude = latitude;
        airLongitude = longitude;

        // Get city

        const locationData = await getCityFromCoordinates(latitude, longitude);

        airCityName =
          locationData.address.city ||
          locationData.address.town ||
          locationData.address.village ||
          locationData.address.municipality ||
          locationData.address.county ||
          "Your Location";

        updateAirCity();

        // Load air quality

        await loadAirQuality();

        // Footer

        updateFooterLiveStatus();

        if (!window.airFooterInterval) {
          window.airFooterInterval = setInterval(updateFooterLiveStatus, 60000);
        }
      } catch (error) {
        console.error("Air quality initialization failed:", error);
      }
    },

    () => {
      try {
        console.log("Location permission denied or unavailable.");
      } catch (error) {
        console.error("Location error handling failed:", error);
      }
    },
  );
} catch (error) {
  console.error("Geolocation setup failed:", error);
}

// Update City Name

function updateAirCity() {
  try {
    const elements = document.querySelectorAll(".air-city-name");

    elements.forEach((element) => {
      element.textContent = airCityName;
    });
  } catch (error) {
    console.error("Air city UI update failed:", error);
  }
}

// City Search

try {
  const airSearchForm = document.getElementById("airSearchForm");

  const airCitySearch = document.getElementById("airCitySearch");

  if (airSearchForm && airCitySearch) {
    airSearchForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const city = airCitySearch.value.trim();

      if (!city) {
        return;
      }

      try {
        const cityData = await getCityCoordinates(city);

        if (!cityData) {
          throw new Error("City not found.");
        }

        airLatitude = cityData.latitude;

        airLongitude = cityData.longitude;

        airCityName = cityData.name;

        updateAirCity();

        await loadAirQuality();

        updateFooterLiveStatus();
      } catch (error) {
        console.error("Air city search failed:", error);
      }
    });
  }
} catch (error) {
  console.error("Air city search setup failed:", error);
}

// Refresh Air Quality

async function refreshAirQuality() {
  try {
    await loadAirQuality();
  } catch (error) {
    console.error("Air quality refresh failed:", error);
  }
}

// Refresh every 10 minutes

try {
  setInterval(refreshAirQuality, 10 * 60 * 1000);
} catch (error) {
  console.error("Air quality refresh timer setup failed:", error);
}

// Footer

function updateFooterLiveStatus() {
  try {
    const footerStatus = document.getElementById("footerLiveStatus");

    if (!footerStatus) {
      return;
    }

    const now = new Date();

    const time = now.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });

    const date = now.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });

    footerStatus.textContent = `Atmosphere · Updated ${time} · ${date}`;
  } catch (error) {
    console.error("Footer status update failed:", error);
  }
}
