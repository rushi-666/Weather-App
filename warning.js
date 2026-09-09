import getCurrentWeather, {
  getCityCoordinates,
  getCityFromCoordinates,
  getAirQuality,
} from "./api.js";

// Shared data

let warningWeather = null;
let warningAirQuality = null;
let warningCity = "Your Location";

let warningLatitude = null;
let warningLongitude = null;

// LOAD ALL WARNING DATA ONCE

async function loadWarningData(city = null) {
  try {
    let latitude;
    let longitude;

    // If a city was searched

    if (city) {
      const coordinates = await getCityCoordinates(city);

      if (!coordinates) {
        throw new Error("City not found");
      }

      latitude = coordinates.latitude;

      longitude = coordinates.longitude;

      warningCity = coordinates.name || city;
    }

    // Otherwise use current location
    else {
      const position = await new Promise((resolve, reject) => {
        try {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000,
          });
        } catch (error) {
          reject(error);
        }
      });

      latitude = position.coords.latitude;

      longitude = position.coords.longitude;

      // Get city name

      try {
        const cityName = await getCityFromCoordinates(latitude, longitude);

        if (typeof cityName === "object" && cityName !== null) {
          const address = cityName.address || {};

          warningCity =
            address.city ||
            address.town ||
            address.village ||
            address.municipality ||
            address.county ||
            cityName.city ||
            cityName.name ||
            "Your Location";
        } else {
          warningCity = cityName || "Your Location";
        }
      } catch (error) {
        console.error("Warning city name loading failed:", error);

        warningCity = "Your Location";
      }
    }

    // Save coordinates for selected location

    warningLatitude = latitude;

    warningLongitude = longitude;

    // Get weather data

    warningWeather = await getCurrentWeather(latitude, longitude);

    // Get air quality data

    warningAirQuality = await getAirQuality(latitude, longitude);

    // Update location on page

    updateWarningLocation();

    return true;
  } catch (error) {
    console.error("Warning data loading failed:", error);

    return false;
  }
}

// CURRENT WEATHER WARNING

function getCurrentWarning() {
  try {
    const weather = warningWeather;

    if (!weather) {
      return "Current weather data unavailable.";
    }

    const temperature = weather.temperature ?? 0;

    const wind = weather.windSpeed ?? 0;

    const visibility = weather.visibility ?? 99999;

    const uv = weather.uvIndex ?? 0;

    const weatherCode = weather.weatherCode;

    if (temperature >= 40) {
      return `Extreme heat: current temperature is ${temperature}°C.`;
    }

    if (temperature <= 5) {
      return `Very cold conditions: current temperature is ${temperature}°C.`;
    }

    if (wind >= 50) {
      return `Strong winds: current wind speed is ${wind} km/h.`;
    }

    if (visibility < 1000) {
      return `Low visibility: approximately ${(visibility / 1000).toFixed(1)} km.`;
    }

    if (uv >= 8) {
      return `High UV exposure: current UV index is ${uv}.`;
    }

    if (weatherCode === 95 || weatherCode === 96 || weatherCode === 99) {
      return "Thunderstorm conditions are currently detected.";
    }

    if (weatherCode === 65 || weatherCode === 67 || weatherCode === 82) {
      return "Heavy precipitation is currently possible.";
    }

    return "No major weather warnings at the moment.";
  } catch (error) {
    console.error("Current weather warning calculation failed:", error);

    return "Unable to calculate current weather warning.";
  }
}

// HOURLY WARNING

function getHourlyWarning() {
  try {
    const weather = warningWeather;

    if (!weather) {
      return "Hourly weather data unavailable.";
    }

    const times = weather.hourlyTime || [];

    const temperatures = weather.hourlyTemperature || [];

    const windSpeeds = weather.hourlyWindSpeed || [];

    const precipitation = weather.hourlyPrecipitation || [];

    if (!times.length) {
      return "Hourly weather data unavailable.";
    }

    const currentTime = new Date(weather.time).getTime();

    let currentIndex = 0;

    for (let i = 0; i < times.length; i++) {
      if (new Date(times[i]).getTime() >= currentTime) {
        currentIndex = i;
        break;
      }
    }

    const endIndex = Math.min(currentIndex + 24, times.length);

    for (let i = currentIndex; i < endIndex; i++) {
      const temperature = temperatures[i] ?? 0;

      const wind = windSpeeds[i] ?? 0;

      const rain = precipitation[i] ?? 0;

      const forecastTime = new Date(times[i]);

      const formattedTime = forecastTime.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });

      if (temperature >= 40) {
        return `Extreme heat expected around ${formattedTime} (${temperature}°C).`;
      }

      if (wind >= 50) {
        return `Strong winds expected around ${formattedTime} (${wind} km/h).`;
      }

      if (rain >= 70) {
        return `High chance of precipitation around ${formattedTime} (${rain}%).`;
      }
    }

    return "No major hourly weather warnings.";
  } catch (error) {
    console.error("Hourly warning calculation failed:", error);

    return "Unable to calculate hourly weather warning.";
  }
}

// 10-DAY WARNING

function getTenDayWarning() {
  try {
    const weather = warningWeather;

    if (!weather) {
      return "10-Day forecast data unavailable.";
    }

    const times = weather.dailyTime || [];

    const highs = weather.dailyHigh || [];

    const lows = weather.dailyLow || [];

    const precipitation = weather.dailyPrecipitation || [];

    const weatherCodes = weather.dailyWeatherCode || [];

    if (!times.length) {
      return "10-Day forecast data unavailable.";
    }

    for (let i = 0; i < Math.min(10, times.length); i++) {
      const high = highs[i];

      const low = lows[i];

      const rain = precipitation[i] ?? 0;

      const code = weatherCodes[i];

      const date = new Date(times[i]);

      const formattedDate = date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });

      if (high >= 40) {
        return `Extreme heat expected on ${formattedDate} (${high}°C).`;
      }

      if (low <= 5) {
        return `Very cold conditions expected on ${formattedDate} (${low}°C).`;
      }

      if (rain >= 70) {
        return `High chance of precipitation on ${formattedDate} (${rain}%).`;
      }

      if (code === 95 || code === 96 || code === 99) {
        return `Thunderstorm conditions possible on ${formattedDate}.`;
      }
    }

    return "No major weather warnings expected during the next 10 days.";
  } catch (error) {
    console.error("10-Day warning calculation failed:", error);

    return "Unable to calculate 10-Day weather warning.";
  }
}

// AIR QUALITY WARNING

function getAirQualityWarning() {
  try {
    const air = warningAirQuality;

    if (!air) {
      return "Air quality data unavailable.";
    }

    const aqi = air.aqi;

    if (aqi == null) {
      return "Air quality data unavailable.";
    }

    if (aqi >= 301) {
      return `Hazardous air quality (AQI ${aqi}). Avoid outdoor activities.`;
    }

    if (aqi >= 201) {
      return `Very unhealthy air quality (AQI ${aqi}). Limit outdoor activities.`;
    }

    if (aqi >= 151) {
      return `Unhealthy air quality (AQI ${aqi}). Outdoor activity may be harmful.`;
    }

    if (aqi >= 101) {
      return `Unhealthy air quality for sensitive groups (AQI ${aqi}).`;
    }

    if (aqi >= 51) {
      return `Moderate air quality (AQI ${aqi}). Sensitive individuals should take care.`;
    }

    return `Good air quality (AQI ${aqi}).`;
  } catch (error) {
    console.error("Air quality warning calculation failed:", error);

    return "Unable to calculate air quality warning.";
  }
}

// MINUTECAST WARNING

function getMinuteWarning() {
  try {
    const weather = warningWeather;

    if (!weather) {
      return {
        city: warningCity,
        warning: "MinuteCast data unavailable.",
      };
    }

    const probabilities = weather.hourlyPrecipitation || [];

    const precipitation = weather.hourlyPrecipitationAmount || [];

    const times = weather.hourlyTime || [];

    if (!probabilities.length || !times.length) {
      return {
        city: warningCity,
        warning: "MinuteCast data unavailable.",
      };
    }

    const currentTime = new Date(weather.time).getTime();

    let currentIndex = 0;

    for (let i = 0; i < times.length; i++) {
      if (new Date(times[i]).getTime() >= currentTime) {
        currentIndex = i;
        break;
      }
    }

    const currentProbability = probabilities[currentIndex] ?? 0;

    const nextProbability =
      probabilities[currentIndex + 1] ?? currentProbability;

    const currentAmount = precipitation[currentIndex] ?? 0;

    const nextAmount = precipitation[currentIndex + 1] ?? currentAmount;

    let highestProbability = 0;
    let warningMinutes = 0;
    let warningAmount = 0;

    for (let minutes = 0; minutes <= 60; minutes += 5) {
      const progress = minutes / 60;

      const probability =
        currentProbability + (nextProbability - currentProbability) * progress;

      const amount = currentAmount + (nextAmount - currentAmount) * progress;

      if (probability > highestProbability) {
        highestProbability = probability;

        warningMinutes = minutes;

        warningAmount = amount;
      }
    }

    let warningText;

    if (highestProbability >= 70) {
      if (warningMinutes === 0) {
        warningText = "High chance of precipitation now.";
      } else {
        warningText = `High chance of precipitation in approximately ${warningMinutes} minutes.`;
      }
    } else if (highestProbability >= 40) {
      if (warningMinutes === 0) {
        warningText = "Moderate chance of precipitation now.";
      } else {
        warningText = `Moderate chance of precipitation in approximately ${warningMinutes} minutes.`;
      }
    } else if (highestProbability > 0) {
      warningText = "Low chance of precipitation during the next 60 minutes.";
    } else {
      warningText = "No precipitation expected during the next 60 minutes.";
    }

    return {
      city: warningCity,

      warning: warningText,

      probability: Math.round(highestProbability),

      precipitation: Number(warningAmount.toFixed(1)),
    };
  } catch (error) {
    console.error("MinuteCast warning calculation failed:", error);

    return {
      city: warningCity,
      warning: "Unable to calculate MinuteCast warning.",
    };
  }
}

// RADAR WARNING

async function getRadarWarning() {
  try {
    const response = await fetch(
      "https://api.rainviewer.com/public/weather-maps.json",
    );

    if (!response.ok) {
      throw new Error("Could not load radar data.");
    }

    const data = await response.json();

    const radarFrames = data.radar?.past || [];

    if (!radarFrames.length) {
      return "Radar data is currently unavailable.";
    }

    const latestFrame = radarFrames[radarFrames.length - 1];

    if (!latestFrame || !latestFrame.time) {
      return "Radar information is unavailable.";
    }

    const radarTime = new Date(latestFrame.time * 1000);

    const now = new Date();

    const ageMinutes = (now.getTime() - radarTime.getTime()) / (1000 * 60);

    if (ageMinutes <= 20) {
      return "Live radar data is available for the selected area.";
    }

    return "Radar data may be delayed. Check the radar map for the latest conditions.";
  } catch (error) {
    console.error("Radar warning failed:", error);

    return "Unable to load radar information.";
  }
}

// ACTIVITY WARNING

function getActivityWarning() {
  try {
    const weather = warningWeather;

    if (!weather) {
      return "Activity weather data unavailable.";
    }

    const temperature = weather.temperature ?? 0;

    const humidity = weather.humidity ?? 0;

    const wind = weather.windSpeed ?? 0;

    const precipitation = weather.dailyPrecipitation?.[0] ?? 0;

    const uv = weather.uvIndex ?? 0;

    if (temperature >= 40) {
      return "Outdoor activities are not recommended because of extreme heat.";
    }

    if (uv >= 8) {
      return "High UV levels detected. Use sun protection during outdoor activities.";
    }

    if (wind >= 40) {
      return "Strong winds may make outdoor activities uncomfortable or unsafe.";
    }

    if (precipitation >= 70) {
      return "High chance of precipitation. Outdoor activities may be affected.";
    }

    if (temperature >= 32 && humidity >= 70) {
      return "Hot and humid conditions may make outdoor activities uncomfortable.";
    }

    return "Weather conditions are generally suitable for outdoor activities.";
  } catch (error) {
    console.error("Activity warning calculation failed:", error);

    return "Unable to calculate activity warning.";
  }
}

// DISPLAY WARNINGS

function displayWarning(id, result) {
  try {
    const element = document.getElementById(id);

    if (!element) {
      return;
    }

    const text = typeof result === "string" ? result : result?.warning;

    element.textContent = text || "Warning unavailable.";
  } catch (error) {
    console.error(`Warning display failed for ${id}:`, error);
  }
}

// UPDATE LOCATION

function updateWarningLocation() {
  try {
    const element = document.getElementById("warningLocation");

    if (element) {
      element.textContent = warningCity;
    }
  } catch (error) {
    console.error("Warning location update failed:", error);
  }
}

// WARNING SUMMARY

function updateWarningSummary(results) {
  try {
    const title = document.getElementById("warningSummaryTitle");

    const text = document.getElementById("warningSummaryText");

    const icon = document.getElementById("warningSummaryIcon");

    if (!title || !text || !icon) {
      return;
    }

    let warningCount = 0;

    results.forEach((result) => {
      try {
        const message = typeof result === "string" ? result : result?.warning;

        if (!message) {
          return;
        }

        const normalMessages = [
          "No major weather warnings",
          "No precipitation expected",
          "Good air quality",
          "Weather conditions are generally suitable",
          "Live radar data is available",
        ];

        const isNormal = normalMessages.some((normal) =>
          message.includes(normal),
        );

        if (!isNormal) {
          warningCount++;
        }
      } catch (error) {
        console.error("Warning summary item processing failed:", error);
      }
    });

    if (warningCount === 0) {
      title.textContent = "No Active Warnings";

      text.textContent =
        "Weather conditions are currently within normal ranges.";

      icon.className = "bi bi-check-circle-fill text-success fs-3 me-3";
    } else {
      title.textContent = `${warningCount} Weather Warning${warningCount > 1 ? "s" : ""}`;

      text.textContent =
        "Some current or forecast conditions require attention.";

      icon.className = "bi bi-exclamation-triangle-fill text-warning fs-3 me-3";
    }
  } catch (error) {
    console.error("Warning summary update failed:", error);
  }
}

// MAIN WARNING SYSTEM

async function initializeWarnings() {
  try {
    const loaded = await loadWarningData();

    if (!loaded) {
      displayWarning(
        "currentWarning",
        "Unable to load current weather warning.",
      );

      displayWarning("hourlyWarning", "Unable to load hourly warning.");

      displayWarning("dailyWarning", "Unable to load 10-Day warning.");

      displayWarning("minuteWarning", "Unable to load MinuteCast warning.");

      displayWarning(
        "airQualityWarning",
        "Unable to load air quality warning.",
      );

      displayWarning("mapWarning", "Unable to load radar information.");

      displayWarning("activityWarning", "Unable to load activity warning.");

      return;
    }

    updateWarningLocation();

    const current = getCurrentWarning();

    const hourly = getHourlyWarning();

    const tenDay = getTenDayWarning();

    const minute = getMinuteWarning();

    const airQuality = getAirQualityWarning();

    const radar = await getRadarWarning();

    const activity = getActivityWarning();

    // Display individual warnings

    displayWarning("currentWarning", current);

    displayWarning("hourlyWarning", hourly);

    displayWarning("dailyWarning", tenDay);

    displayWarning("minuteWarning", minute);

    displayWarning("airQualityWarning", airQuality);

    displayWarning("mapWarning", radar);

    displayWarning("activityWarning", activity);

    // Update overall summary

    updateWarningSummary([
      current,
      hourly,
      tenDay,
      minute,
      airQuality,
      radar,
      activity,
    ]);
  } catch (error) {
    console.error("Warning system initialization failed:", error);
  }
}

// START WARNING SYSTEM

try {
  const searchBtn = document.getElementById("searchBtn");

  const citySearch = document.getElementById("citySearch");

  if (searchBtn && citySearch) {
    searchBtn.addEventListener("click", async () => {
      try {
        const city = citySearch.value.trim();

        if (!city) {
          alert("Please enter a city name.");

          return;
        }

        // Show loading state

        const warningLocation = document.getElementById("warningLocation");

        const currentWarning = document.getElementById("currentWarning");

        const hourlyWarning = document.getElementById("hourlyWarning");

        const minuteWarning = document.getElementById("minuteWarning");

        const dailyWarning = document.getElementById("dailyWarning");

        const airQualityWarning = document.getElementById("airQualityWarning");

        const mapWarning = document.getElementById("mapWarning");

        const activityWarning = document.getElementById("activityWarning");

        if (warningLocation) {
          warningLocation.textContent = "Loading...";
        }

        if (currentWarning) {
          currentWarning.textContent = "Loading...";
        }

        if (hourlyWarning) {
          hourlyWarning.textContent = "Loading...";
        }

        if (minuteWarning) {
          minuteWarning.textContent = "Loading...";
        }

        if (dailyWarning) {
          dailyWarning.textContent = "Loading...";
        }

        if (airQualityWarning) {
          airQualityWarning.textContent = "Loading...";
        }

        if (mapWarning) {
          mapWarning.textContent = "Loading...";
        }

        if (activityWarning) {
          activityWarning.textContent = "Loading...";
        }

        // Load weather for searched city

        const success = await loadWarningData(city);

        if (!success) {
          if (warningLocation) {
            warningLocation.textContent = "City not found";
          }

          const summaryTitle = document.getElementById("warningSummaryTitle");

          const summaryText = document.getElementById("warningSummaryText");

          if (summaryTitle) {
            summaryTitle.textContent = "Unable to load weather";
          }

          if (summaryText) {
            summaryText.textContent =
              "Please check the city name and try again.";
          }

          return;
        }

        // Generate warnings for searched city

        const current = getCurrentWarning();

        const hourly = getHourlyWarning();

        const tenDay = getTenDayWarning();

        const minute = getMinuteWarning();

        const airQuality = getAirQualityWarning();

        const radar = await getRadarWarning();

        const activity = getActivityWarning();

        // Display warnings

        displayWarning("currentWarning", current);

        displayWarning("hourlyWarning", hourly);

        displayWarning("minuteWarning", minute);

        displayWarning("dailyWarning", tenDay);

        displayWarning("airQualityWarning", airQuality);

        displayWarning("mapWarning", radar);

        displayWarning("activityWarning", activity);

        // Update overall summary

        updateWarningSummary([
          current,
          hourly,
          minute,
          tenDay,
          airQuality,
          radar,
          activity,
        ]);
      } catch (error) {
        console.error("Warning city search failed:", error);
      }
    });

    // Allow pressing Enter to search

    citySearch.addEventListener("keydown", (event) => {
      try {
        if (event.key === "Enter") {
          searchBtn.click();
        }
      } catch (error) {
        console.error("Warning search keyboard handler failed:", error);
      }
    });
  }
} catch (error) {
  console.error("Warning search setup failed:", error);
}

// LOAD CURRENT LOCATION WHEN PAGE OPENS

try {
  initializeWarnings();
} catch (error) {
  console.error("Warning system startup failed:", error);
}
