import getCurrentWeather, {
  getAirQuality,
  getCityCoordinates,
  getCityFromCoordinates,
} from "./api.js";

// Health & Activities State

let activityLatitude = null;
let activityLongitude = null;
let activityCityName = "";

// Current Location

try {
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        activityLatitude = latitude;
        activityLongitude = longitude;

        // Get city name
        const locationData = await getCityFromCoordinates(latitude, longitude);

        activityCityName =
          locationData.address.city ||
          locationData.address.town ||
          locationData.address.village ||
          locationData.address.municipality ||
          locationData.address.county ||
          "Your Location";

        updateActivityCity();

        // Load weather and air quality
        await loadActivityData();
      } catch (error) {
        console.error("Activities initialization failed:", error);
      }
    },

    (error) => {
      try {
        console.log("Location permission denied or unavailable.");
      } catch (handlerError) {
        console.error("Location error handling failed:", handlerError);
      }
    },
  );
} catch (error) {
  console.error("Geolocation setup failed:", error);
}

// Update City Name

function updateActivityCity() {
  try {
    const elements = document.querySelectorAll(".activity-city-name");

    elements.forEach((element) => {
      element.textContent = activityCityName;
    });
  } catch (error) {
    console.error("Activity city UI update failed:", error);
  }
}

// City Search

try {
  const activitySearchForm = document.querySelector("#searchForm");

  const activityCitySearch = document.querySelector("#citySearch");

  if (activitySearchForm && activityCitySearch) {
    activitySearchForm.addEventListener("submit", async (event) => {
      try {
        event.preventDefault();

        const city = activityCitySearch.value.trim();

        if (!city) {
          return;
        }

        try {
          const location = await getCityCoordinates(city);

          if (!location) {
            throw new Error("City not found.");
          }

          activityLatitude = location.latitude;

          activityLongitude = location.longitude;

          activityCityName = location.name || city;

          // Update city name immediately
          updateActivityCity();

          // Clear old activity results while new city is loading

          document.querySelectorAll(".activity-status").forEach((element) => {
            element.textContent = "Loading...";
          });

          document.querySelectorAll(".activity-message").forEach((element) => {
            element.textContent = "Checking weather and air quality...";
          });

          document
            .querySelectorAll(".activity-best-time")
            .forEach((element) => {
              element.textContent = "Best time today: Calculating...";
            });

          document.querySelectorAll(".progress-bar").forEach((element) => {
            element.style.width = "0%";

            element.setAttribute("aria-valuenow", "0");

            element.classList.remove(
              "activity-excellent",
              "activity-good",
              "activity-fair",
              "activity-poor",
              "activity-avoid",
            );
          });

          // Load new city's data
          await loadActivityData();
        } catch (error) {
          console.error("Activity city search failed:", error);
        }
      } catch (error) {
        console.error("Activity search event failed:", error);
      }
    });
  }
} catch (error) {
  console.error("Activity city search setup failed:", error);
}

// Load Weather and Air Quality

async function loadActivityData() {
  try {
    if (activityLatitude === null || activityLongitude === null) {
      return;
    }

    const weather = await getCurrentWeather(
      activityLatitude,
      activityLongitude,
    );

    const airQuality = await getAirQuality(activityLatitude, activityLongitude);

    // Update What to Wear and Sun Protection
    updateWearRecommendation(weather);
    updateSunProtection(weather);

    // Running

    const runningScore = calculateActivityScore("running", weather, airQuality);

    updateActivityCard(
      "#runningActivity",
      runningScore,
      "running",
      weather,
      airQuality,
    );

    // Cycling

    const cyclingScore = calculateActivityScore("cycling", weather, airQuality);

    updateActivityCard(
      "#cyclingActivity",
      cyclingScore,
      "cycling",
      weather,
      airQuality,
    );

    // Golf

    const golfScore = calculateActivityScore("golf", weather, airQuality);

    updateActivityCard("#golfActivity", golfScore, "golf", weather, airQuality);

    // Swimming

    const swimmingScore = calculateActivityScore(
      "swimming",
      weather,
      airQuality,
    );

    updateActivityCard(
      "#swimmingActivity",
      swimmingScore,
      "swimming",
      weather,
      airQuality,
    );

    // Yoga

    const yogaScore = calculateActivityScore("yoga", weather, airQuality);

    updateActivityCard("#yogaActivity", yogaScore, "yoga", weather, airQuality);

    // Gardening

    const gardeningScore = calculateActivityScore(
      "gardening",
      weather,
      airQuality,
    );

    updateActivityCard(
      "#gardeningActivity",
      gardeningScore,
      "gardening",
      weather,
      airQuality,
    );
  } catch (error) {
    console.error("Activities data loading failed:", error);
  }
}

// Calculate Activity Score

function calculateActivityScore(activity, weather, airQuality) {
  try {
    let score = 100;

    const temperature = weather?.temperature;

    const feelsLike = weather?.feelsLike;

    const windSpeed = weather?.windSpeed;

    const uvIndex = weather?.uvIndex;

    const weatherCode = weather?.weatherCode;

    const aqi = airQuality?.aqi;

    const rainProbability = weather?.dailyPrecipitation?.[0] ?? 0;

    // General temperature condition

    if (temperature != null) {
      if (temperature < 5 || temperature > 40) {
        score -= 30;
      } else if (temperature < 10 || temperature > 35) {
        score -= 20;
      } else if (temperature < 15 || temperature > 32) {
        score -= 10;
      }
    }

    // Feels-like temperature

    if (feelsLike != null) {
      if (feelsLike > 40) {
        score -= 20;
      } else if (feelsLike > 35) {
        score -= 10;
      }
    }

    // Air Quality

    if (aqi != null) {
      if (aqi > 300) {
        score -= 50;
      } else if (aqi > 200) {
        score -= 40;
      } else if (aqi > 150) {
        score -= 30;
      } else if (aqi > 100) {
        score -= 20;
      } else if (aqi > 50) {
        score -= 10;
      }
    }

    // Today's Rain Probability

    if (rainProbability >= 80) {
      if (
        activity === "running" ||
        activity === "cycling" ||
        activity === "golf" ||
        activity === "gardening"
      ) {
        score -= 25;
      }

      if (activity === "swimming") {
        score -= 10;
      }
    } else if (rainProbability >= 60) {
      if (
        activity === "running" ||
        activity === "cycling" ||
        activity === "golf" ||
        activity === "gardening"
      ) {
        score -= 15;
      }

      if (activity === "swimming") {
        score -= 5;
      }
    } else if (rainProbability >= 40) {
      if (
        activity === "running" ||
        activity === "cycling" ||
        activity === "golf" ||
        activity === "gardening"
      ) {
        score -= 8;
      }
    }

    // Activity-specific conditions

    // RUNNING

    if (activity === "running") {
      if (windSpeed != null) {
        if (windSpeed > 40) {
          score -= 25;
        } else if (windSpeed > 30) {
          score -= 15;
        } else if (windSpeed > 20) {
          score -= 5;
        }
      }

      if (uvIndex != null) {
        if (uvIndex >= 10) {
          score -= 20;
        } else if (uvIndex >= 8) {
          score -= 15;
        } else if (uvIndex >= 6) {
          score -= 5;
        }
      }
    }

    // CYCLING

    if (activity === "cycling") {
      if (windSpeed != null) {
        if (windSpeed > 40) {
          score -= 30;
        } else if (windSpeed > 30) {
          score -= 20;
        } else if (windSpeed > 20) {
          score -= 10;
        }
      }

      if (uvIndex != null && uvIndex >= 8) {
        score -= 10;
      }
    }

    // GOLF

    if (activity === "golf") {
      if (temperature != null) {
        if (temperature > 35) {
          score -= 20;
        }
      }

      if (windSpeed != null) {
        if (windSpeed > 30) {
          score -= 20;
        } else if (windSpeed > 20) {
          score -= 10;
        }
      }

      if (uvIndex != null && uvIndex >= 8) {
        score -= 10;
      }
    }

    // SWIMMING

    if (activity === "swimming") {
      // Thunderstorm is a major problem

      if ([95, 96, 99].includes(weatherCode)) {
        score -= 40;
      }

      // Heavy rain

      if ([65, 67, 82].includes(weatherCode)) {
        score -= 20;
      }

      // Very cold or very hot weather

      if (temperature != null) {
        if (temperature < 15) {
          score -= 20;
        } else if (temperature > 38) {
          score -= 15;
        }
      }
    }

    // YOGA

    if (activity === "yoga") {
      // Yoga is less affected by wind
      // but extreme heat is uncomfortable

      if (temperature != null) {
        if (temperature > 35) {
          score -= 15;
        }
      }

      // Outdoor yoga and strong UV

      if (uvIndex != null) {
        if (uvIndex >= 10) {
          score -= 15;
        } else if (uvIndex >= 8) {
          score -= 10;
        }
      }

      // Wind has little effect on indoor yoga
    }

    // GARDENING

    if (activity === "gardening") {
      if (temperature != null) {
        if (temperature > 35) {
          score -= 20;
        } else if (temperature > 32) {
          score -= 10;
        }
      }

      if (windSpeed != null && windSpeed > 30) {
        score -= 15;
      }

      if (uvIndex != null) {
        if (uvIndex >= 10) {
          score -= 20;
        } else if (uvIndex >= 8) {
          score -= 10;
        }
      }

      // Rain is bad for gardening activity

      if ([61, 63, 65, 66, 67, 80, 81, 82].includes(weatherCode)) {
        score -= 20;
      }
    }

    return Math.max(0, Math.min(100, score));
  } catch (error) {
    console.error("Activity score calculation failed:", error);

    return 0;
  }
}

// Get Best Activity Time

function getBestActivityTime(activity, weather, airQuality) {
  try {
    const times = weather?.hourlyTime || [];

    const temperatures = weather?.hourlyTemperature || [];

    const rain = weather?.hourlyPrecipitation || [];

    const wind = weather?.hourlyWindSpeed || [];

    const weatherCodes = weather?.hourlyWeatherCode || [];

    const aqi = airQuality?.aqi ?? 0;

    if (!times.length) {
      return null;
    }

    let bestStartIndex = -1;
    let bestScore = -Infinity;

    // Check every possible 2-hour window

    for (let i = 0; i < times.length - 1; i++) {
      const hour1 = Number(times[i].slice(11, 13));

      const hour2 = Number(times[i + 1].slice(11, 13));

      // Only consider 6 AM to 8 PM

      if (hour1 < 6 || hour1 > 19) {
        continue;
      }

      // Make sure the second hour is also daytime

      if (hour2 < 6 || hour2 > 20) {
        continue;
      }

      // First hour

      const temperature1 = temperatures[i];

      const rainProbability1 = rain[i] ?? 0;

      const windSpeed1 = wind[i] ?? 0;

      const weatherCode1 = weatherCodes[i];

      let score1 = 100;

      // Temperature

      if (temperature1 < 10 || temperature1 > 38) {
        score1 -= 30;
      } else if (temperature1 < 15 || temperature1 > 34) {
        score1 -= 15;
      }

      // Rain

      if (
        activity === "running" ||
        activity === "cycling" ||
        activity === "golf" ||
        activity === "gardening"
      ) {
        if (rainProbability1 >= 80) {
          score1 -= 35;
        } else if (rainProbability1 >= 60) {
          score1 -= 25;
        } else if (rainProbability1 >= 40) {
          score1 -= 10;
        }
      }

      if (activity === "swimming") {
        if (rainProbability1 >= 90) {
          score1 -= 20;
        } else if (rainProbability1 >= 70) {
          score1 -= 10;
        }
      }

      if (activity === "yoga") {
        if (rainProbability1 >= 80) {
          score1 -= 20;
        } else if (rainProbability1 >= 60) {
          score1 -= 10;
        }
      }

      // Wind

      if (windSpeed1 > 40) {
        score1 -= 30;
      } else if (windSpeed1 > 30) {
        score1 -= 20;
      } else if (windSpeed1 > 20) {
        score1 -= 10;
      }

      // Thunderstorm

      if ([95, 96, 99].includes(weatherCode1)) {
        score1 -= 50;
      }

      // Activity-specific

      if (activity === "running") {
        if (temperature1 < 15 || temperature1 > 30) {
          score1 -= 15;
        }

        if (windSpeed1 > 25) {
          score1 -= 10;
        }
      }

      if (activity === "cycling") {
        if (temperature1 < 15 || temperature1 > 30) {
          score1 -= 15;
        }

        if (windSpeed1 > 25) {
          score1 -= 15;
        }
      }

      if (activity === "golf") {
        if (temperature1 < 18 || temperature1 > 30) {
          score1 -= 15;
        }

        if (windSpeed1 > 20) {
          score1 -= 15;
        }
      }

      if (activity === "swimming") {
        if (temperature1 < 20) {
          score1 -= 20;
        }

        if (temperature1 > 35) {
          score1 -= 15;
        }
      }

      if (activity === "yoga") {
        if (temperature1 < 18 || temperature1 > 30) {
          score1 -= 10;
        }

        if (windSpeed1 > 20) {
          score1 -= 5;
        }
      }

      if (activity === "gardening") {
        if (temperature1 < 15 || temperature1 > 32) {
          score1 -= 15;
        }

        if (windSpeed1 > 25) {
          score1 -= 10;
        }
      }

      // Second hour

      const temperature2 = temperatures[i + 1];

      const rainProbability2 = rain[i + 1] ?? 0;

      const windSpeed2 = wind[i + 1] ?? 0;

      const weatherCode2 = weatherCodes[i + 1];

      let score2 = 100;

      // Temperature

      if (temperature2 < 10 || temperature2 > 38) {
        score2 -= 30;
      } else if (temperature2 < 15 || temperature2 > 34) {
        score2 -= 15;
      }

      // Rain

      if (
        activity === "running" ||
        activity === "cycling" ||
        activity === "golf" ||
        activity === "gardening"
      ) {
        if (rainProbability2 >= 80) {
          score2 -= 35;
        } else if (rainProbability2 >= 60) {
          score2 -= 25;
        } else if (rainProbability2 >= 40) {
          score2 -= 10;
        }
      }

      if (activity === "swimming") {
        if (rainProbability2 >= 90) {
          score2 -= 20;
        } else if (rainProbability2 >= 70) {
          score2 -= 10;
        }
      }

      if (activity === "yoga") {
        if (rainProbability2 >= 80) {
          score2 -= 20;
        } else if (rainProbability2 >= 60) {
          score2 -= 10;
        }
      }

      // Wind

      if (windSpeed2 > 40) {
        score2 -= 30;
      } else if (windSpeed2 > 30) {
        score2 -= 20;
      } else if (windSpeed2 > 20) {
        score2 -= 10;
      }

      // Thunderstorm

      if ([95, 96, 99].includes(weatherCode2)) {
        score2 -= 50;
      }

      // Activity-specific

      if (activity === "running") {
        if (temperature2 < 15 || temperature2 > 30) {
          score2 -= 15;
        }

        if (windSpeed2 > 25) {
          score2 -= 10;
        }
      }

      if (activity === "cycling") {
        if (temperature2 < 15 || temperature2 > 30) {
          score2 -= 15;
        }

        if (windSpeed2 > 25) {
          score2 -= 15;
        }
      }

      if (activity === "golf") {
        if (temperature2 < 18 || temperature2 > 30) {
          score2 -= 15;
        }

        if (windSpeed2 > 20) {
          score2 -= 15;
        }
      }

      if (activity === "swimming") {
        if (temperature2 < 20) {
          score2 -= 20;
        }

        if (temperature2 > 35) {
          score2 -= 15;
        }
      }

      if (activity === "yoga") {
        if (temperature2 < 18 || temperature2 > 30) {
          score2 -= 10;
        }

        if (windSpeed2 > 20) {
          score2 -= 5;
        }
      }

      if (activity === "gardening") {
        if (temperature2 < 15 || temperature2 > 32) {
          score2 -= 15;
        }

        if (windSpeed2 > 25) {
          score2 -= 10;
        }
      }

      // AQI

      if (aqi > 300) {
        score1 -= 40;
        score2 -= 40;
      } else if (aqi > 200) {
        score1 -= 30;
        score2 -= 30;
      } else if (aqi > 150) {
        score1 -= 20;
        score2 -= 20;
      } else if (aqi > 100) {
        score1 -= 10;
        score2 -= 10;
      }

      // Average score of the 2-hour window

      const windowScore = (score1 + score2) / 2;

      if (windowScore > bestScore) {
        bestScore = windowScore;
        bestStartIndex = i;
      }
    }

    if (bestStartIndex === -1) {
      return null;
    }

    const startDate = new Date(times[bestStartIndex]);

    const endDate = new Date(times[bestStartIndex + 1]);

    const formatTime = (date) =>
      date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });

    return {
      time: `${formatTime(startDate)} – ${formatTime(endDate)}`,
      score: Math.max(0, Math.min(100, bestScore)),
    };
  } catch (error) {
    console.error("Best activity time calculation failed:", error);

    return null;
  }
}

// Activity Recommendation

function getActivityRecommendation(score, activity, weather, airQuality) {
  try {
    const rainProbability = weather?.dailyPrecipitation?.[0] ?? 0;

    const temperature = weather?.temperature;

    const feelsLike = weather?.feelsLike;

    const windSpeed = weather?.windSpeed;

    const uvIndex = weather?.uvIndex;

    const weatherCode = weather?.weatherCode;

    const aqi = airQuality?.aqi;

    // Dangerous conditions

    if ([95, 96, 99].includes(weatherCode)) {
      return {
        status: "Avoid",
        message: "Thunderstorm conditions detected. Avoid outdoor activity.",
      };
    }

    if (aqi > 200) {
      return {
        status: "Avoid",
        message: "Air quality is unhealthy. Avoid prolonged outdoor activity.",
      };
    }

    // Activity-specific reasons

    if (
      rainProbability >= 80 &&
      (activity === "running" ||
        activity === "cycling" ||
        activity === "golf" ||
        activity === "gardening")
    ) {
      return {
        status: score >= 60 ? "Fair" : "Poor",

        message:
          "High chance of rain today. Consider postponing this outdoor activity.",
      };
    }

    if (temperature > 35 || feelsLike > 38) {
      return {
        status: score >= 60 ? "Fair" : "Poor",

        message: "High heat may make this activity uncomfortable.",
      };
    }

    if (windSpeed > 30) {
      return {
        status: score >= 60 ? "Fair" : "Poor",

        message: "Strong winds may make this activity difficult.",
      };
    }

    if (uvIndex >= 8) {
      return {
        status: score >= 60 ? "Fair" : "Poor",

        message:
          "High UV exposure. Consider sun protection and a shorter session.",
      };
    }

    // Normal recommendation

    if (score >= 80) {
      return {
        status: "Excellent",
        message: "Great conditions for this activity.",
      };
    }

    if (score >= 60) {
      return {
        status: "Good",
        message: "Generally good conditions for this activity.",
      };
    }

    if (score >= 40) {
      return {
        status: "Fair",
        message: "Some weather conditions may reduce comfort.",
      };
    }

    if (score >= 20) {
      return {
        status: "Poor",
        message: "Consider limiting or postponing this activity.",
      };
    }

    return {
      status: "Avoid",
      message: "Current conditions are not suitable for this activity.",
    };
  } catch (error) {
    console.error("Activity recommendation calculation failed:", error);

    return {
      status: "Avoid",
      message: "Activity recommendation is currently unavailable.",
    };
  }
}

// Update Activity Card

function updateActivityCard(selector, score, activity, weather, airQuality) {
  try {
    // Find the activity card FIRST

    const card = document.querySelector(selector);

    if (!card) {
      return;
    }

    // Activity recommendation

    const recommendation = getActivityRecommendation(
      score,
      activity,
      weather,
      airQuality,
    );

    // Status

    const statusElement = card.querySelector(".activity-status");

    if (statusElement) {
      statusElement.textContent = recommendation.status;
    }

    // Match status text with recommendation

    if (statusElement) {
      statusElement.classList.remove(
        "status-excellent",
        "status-good",
        "status-fair",
        "status-poor",
        "status-avoid",
      );

      const status = recommendation.status.toLowerCase();

      if (status === "excellent") {
        statusElement.classList.add("status-excellent");
      } else if (status === "good") {
        statusElement.classList.add("status-good");
      } else if (status === "fair") {
        statusElement.classList.add("status-fair");
      } else if (status === "poor") {
        statusElement.classList.add("status-poor");
      } else {
        statusElement.classList.add("status-avoid");
      }
    }

    // Message

    const messageElement = card.querySelector(".activity-message");

    if (messageElement) {
      messageElement.textContent = recommendation.message;
    }

    // Progress bar

    const progressElement = card.querySelector(".progress-bar");

    if (progressElement) {
      const percentage = Math.max(0, Math.min(100, Number(score)));

      // Set bar width

      progressElement.style.setProperty("width", `${percentage}%`, "important");

      // Accessibility

      progressElement.setAttribute("aria-valuenow", percentage);

      // Remove old colors

      progressElement.classList.remove(
        "activity-excellent",
        "activity-good",
        "activity-fair",
        "activity-poor",
        "activity-avoid",
      );

      // Apply color based on recommendation status

      const status = recommendation.status.toLowerCase();

      if (status === "excellent" || status === "good") {
        progressElement.style.setProperty(
          "background-color",
          "#198754",
          "important",
        );
      } else if (status === "fair") {
        progressElement.style.setProperty(
          "background-color",
          "#ffc107",
          "important",
        );
      } else {
        // Poor or Avoid

        progressElement.style.setProperty(
          "background-color",
          "#dc3545",
          "important",
        );
      }
    }

    // Best time

    const bestTimeElement = card.querySelector(".activity-best-time");

    if (bestTimeElement) {
      const bestTime = getBestActivityTime(activity, weather, airQuality);

      if (bestTime) {
        bestTimeElement.textContent = `Best time today: ${bestTime.time}`;
      } else {
        bestTimeElement.textContent = "Best time today: Not available";
      }
    }
  } catch (error) {
    console.error("Activity card update failed:", error);
  }
}

// What to Wear Recommendation

function updateWearRecommendation(weather) {
  try {
    const wearElement = document.querySelector("#wearRecommendation");

    if (!wearElement) {
      return;
    }

    const temperature = weather?.temperature;

    const feelsLike = weather?.feelsLike;

    const rainProbability = weather?.dailyPrecipitation?.[0] ?? 0;

    const windSpeed = weather?.windSpeed ?? 0;

    if (temperature == null) {
      wearElement.textContent = "Weather information unavailable.";

      return;
    }

    let recommendation = "";

    // Very cold

    if (temperature < 10) {
      recommendation = "Warm layers, jacket, and comfortable shoes.";
    }

    // Cool
    else if (temperature < 18) {
      recommendation = "Light jacket or sweater with comfortable shoes.";
    }

    // Comfortable
    else if (temperature < 28) {
      recommendation = "Light, breathable clothing and comfortable shoes.";
    }

    // Warm
    else if (temperature < 35) {
      recommendation = "Light, breathable clothing and comfortable shoes.";
    }

    // Hot
    else {
      recommendation = "Loose, lightweight clothing and breathable shoes.";
    }

    // Rain adjustment

    if (rainProbability >= 60) {
      recommendation += " Carry an umbrella or rain protection.";
    }

    // Strong wind adjustment

    if (windSpeed > 30) {
      recommendation += " A light wind-resistant layer may help.";
    }

    wearElement.textContent = recommendation;
  } catch (error) {
    console.error("Wear recommendation update failed:", error);
  }
}

// Sun Protection Recommendation

function updateSunProtection(weather) {
  try {
    const sunElement = document.querySelector("#sunRecommendation");

    if (!sunElement) {
      return;
    }

    const uvIndex = weather?.uvIndex;

    if (uvIndex == null) {
      sunElement.textContent = "UV information unavailable.";

      return;
    }

    if (uvIndex <= 2) {
      sunElement.textContent = `UV ${uvIndex} — Minimal sun protection needed.`;
    } else if (uvIndex <= 5) {
      sunElement.textContent = `UV ${uvIndex} — SPF 30 recommended.`;
    } else if (uvIndex <= 7) {
      sunElement.textContent = `UV ${uvIndex} — SPF 30+ recommended. Wear sunglasses and seek shade.`;
    } else if (uvIndex <= 10) {
      sunElement.textContent = `UV ${uvIndex} — SPF 30+ recommended. Wear sunglasses, a hat, and seek shade.`;
    } else {
      sunElement.textContent = `UV ${uvIndex} — Very high UV. Use SPF 50+, protective clothing, and avoid prolonged sun exposure.`;
    }
  } catch (error) {
    console.error("Sun protection update failed:", error);
  }
}

// Live Footer Update Time

function updateFooterTime() {
  try {
    const footerElement = document.querySelector("#footerUpdateTime");

    if (!footerElement) {
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

    footerElement.textContent = `Atmosphere · Updated ${time} · ${date}`;
  } catch (error) {
    console.error("Footer time update failed:", error);
  }
}

// Update immediately

try {
  updateFooterTime();
} catch (error) {
  console.error("Initial footer update failed:", error);
}

// Update every minute

try {
  setInterval(updateFooterTime, 60000);
} catch (error) {
  console.error("Footer timer setup failed:", error);
}
