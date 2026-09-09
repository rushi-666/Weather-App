import getCurrentWeather, {
  getCityCoordinates,
  getCityFromCoordinates,
} from "./api.js";

import { updateChart } from "./chart.js";

let temperatureUnit = localStorage.getItem("temperatureUnit") || "C";
let currentWeatherData = null;

function convertTemperature(celsius) {
  if (temperatureUnit === "F") {
    return Math.round((celsius * 9) / 5 + 32);
  }

  return Math.round(celsius);
}

function displayWeather(weather, cityName, countryCode) {
  try {
    if (!weather) {
      throw new Error("Weather data is not available.");
    }

    currentWeatherData = weather;

    const temperature = weather.temperature;
    const dewPoint = weather.dewPoint;
    const uvIndex = weather.uvIndex;
    const pressure = weather.pressure;
    const visibility = weather.visibility;
    const humidity = weather.humidity;
    const windSpeed = weather.windSpeed;
    const windDirection = weather.windDirection;
    const feelsLike = weather.feelsLike;
    const high = weather.high;
    const low = weather.low;
    const weatherCode = weather.weatherCode;

    document.getElementById("temperature").textContent =
      `${convertTemperature(temperature)}°${temperatureUnit}`;

    document.getElementById("cityName").textContent =
      `${cityName}, ${countryCode}`;

    document.getElementById("highLow").textContent =
      `H: ${convertTemperature(high)}°${temperatureUnit} · L: ${convertTemperature(low)}°${temperatureUnit}`;

    document.getElementById("feelsLike").textContent =
      `Feels like ${convertTemperature(feelsLike)}°${temperatureUnit}`;

    document.getElementById("windSpeed").textContent = `${windSpeed} km/h`;

    document.getElementById("windDirection").textContent =
      getWindDirection(windDirection);

    document.getElementById("humidity").textContent = `${humidity}%`;

    const visibilityKm = visibility / 1000;

    document.getElementById("visibility").textContent =
      `${visibilityKm.toFixed(1)} km`;

    let visibilityStatus;

    if (visibilityKm >= 10) {
      visibilityStatus = "Excellent";
    } else if (visibilityKm >= 5) {
      visibilityStatus = "Good";
    } else if (visibilityKm >= 2) {
      visibilityStatus = "Moderate";
    } else {
      visibilityStatus = "Poor";
    }

    document.getElementById("visibilityStatus").textContent = visibilityStatus;

    document.getElementById("pressure").textContent = pressure.toFixed(1);

    let pressureStatus;

    if (pressure < 1000) {
      pressureStatus = "Low";
    } else if (pressure <= 1020) {
      pressureStatus = "Normal";
    } else {
      pressureStatus = "High";
    }

    document.getElementById("pressureStatus").textContent = pressureStatus;

    document.getElementById("uvIndex").textContent = uvIndex.toFixed(1);

    let uvStatus;

    if (uvIndex <= 2) {
      uvStatus = "Low";
    } else if (uvIndex <= 5) {
      uvStatus = "Moderate";
    } else if (uvIndex <= 7) {
      uvStatus = "High";
    } else if (uvIndex <= 10) {
      uvStatus = "Very High";
    } else {
      uvStatus = "Extreme";
    }

    document.getElementById("uvStatus").textContent = uvStatus;

    document.getElementById("dewPoint").textContent =
      `${convertTemperature(dewPoint)}°${temperatureUnit}`;

    let dewPointStatus;

    if (dewPoint < 10) {
      dewPointStatus = "Dry";
    } else if (dewPoint < 16) {
      dewPointStatus = "Comfortable";
    } else if (dewPoint < 21) {
      dewPointStatus = "Humid";
    } else {
      dewPointStatus = "Very Humid";
    }

    document.getElementById("dewPointStatus").textContent = dewPointStatus;

    let weatherCondition;

    if (weatherCode === 0) {
      weatherCondition = "Clear Sky";
    } else if (weatherCode === 1) {
      weatherCondition = "Mainly Clear";
    } else if (weatherCode === 2) {
      weatherCondition = "Partly Cloudy";
    } else if (weatherCode === 3) {
      weatherCondition = "Overcast";
    } else if ([45, 48].includes(weatherCode)) {
      weatherCondition = "Foggy";
    } else if ([51, 53, 55, 56, 57].includes(weatherCode)) {
      weatherCondition = "Drizzle";
    } else if ([61, 63, 65, 66, 67].includes(weatherCode)) {
      weatherCondition = "Rain";
    } else if ([71, 73, 75, 77].includes(weatherCode)) {
      weatherCondition = "Snow";
    } else if ([80, 81, 82].includes(weatherCode)) {
      weatherCondition = "Rain Showers";
    } else if ([95, 96, 99].includes(weatherCode)) {
      weatherCondition = "Thunderstorm";
    } else {
      weatherCondition = "Unknown";
    }

    let weatherImage;

    if (weatherCode === 0) {
      weatherImage = "media/clear-sky.svg";
    } else if ([1, 2].includes(weatherCode)) {
      weatherImage = "media/partly-cloudy.svg";
    } else if (weatherCode === 3) {
      weatherImage = "media/cloudy.svg";
    } else if ([45, 48].includes(weatherCode)) {
      weatherImage = "media/fog.svg";
    } else if (
      [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(weatherCode)
    ) {
      weatherImage = "media/rain.svg";
    } else if ([71, 73, 75, 77].includes(weatherCode)) {
      weatherImage = "media/snow.svg";
    } else if ([95, 96, 99].includes(weatherCode)) {
      weatherImage = "media/thunderstorm.svg";
    } else {
      weatherImage = "media/cloudy.svg";
    }

    document.getElementById("weatherCondition").textContent = weatherCondition;

    document.getElementById("weatherImage").src = weatherImage;

    const now = new Date();

    const formattedDate = now.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });

    const formattedTime = now.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });

    document.getElementById("updatedTime").textContent =
      `Atmosphere · Updated ${formattedTime} · ${formattedDate}`;

    updateChart(
      weather.hourlyTime,
      weather.hourlyTemperature.map((temp) => convertTemperature(temp)),
    );

    updateHourlyCards(
      weather.hourlyTime,
      weather.hourlyTemperature,
      weather.hourlyWeatherCode,
    );

    updateDailyForecast(
      weather.dailyTime,
      weather.dailyHigh,
      weather.dailyLow,
      weather.dailyWeatherCode,
      weather.dailyPrecipitation,
    );
  } catch (error) {
    console.error("Weather display failed:", error);

    const weatherCondition = document.getElementById("weatherCondition");

    if (weatherCondition) {
      weatherCondition.textContent = "Weather data unavailable";
    }
  }
}

function getWindDirection(degrees) {
  try {
    const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

    const index = Math.round(degrees / 45) % 8;

    return directions[index];
  } catch (error) {
    console.error("Wind direction calculation failed:", error);

    return "—";
  }
}

function getWeatherIcon(weatherCode) {
  try {
    if (weatherCode === 0) {
      return "media/clear-sky.svg";
    } else if ([1, 2].includes(weatherCode)) {
      return "media/partly-cloudy.svg";
    } else if (weatherCode === 3) {
      return "media/cloudy.svg";
    } else if ([45, 48].includes(weatherCode)) {
      return "media/fog.svg";
    } else if (
      [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(weatherCode)
    ) {
      return "media/rain.svg";
    } else if ([71, 73, 75, 77].includes(weatherCode)) {
      return "media/snow.svg";
    } else if ([95, 96, 99].includes(weatherCode)) {
      return "media/thunderstorm.svg";
    } else {
      return "media/cloudy.svg";
    }
  } catch (error) {
    console.error("Weather icon loading failed:", error);

    return "media/cloudy.svg";
  }
}

function getWeatherCondition(weatherCode) {
  try {
    if (weatherCode === 0) {
      return "Clear Sky";
    } else if (weatherCode === 1) {
      return "Mainly Clear";
    } else if (weatherCode === 2) {
      return "Partly Cloudy";
    } else if (weatherCode === 3) {
      return "Overcast";
    } else if ([45, 48].includes(weatherCode)) {
      return "Foggy";
    } else if ([51, 53, 55, 56, 57].includes(weatherCode)) {
      return "Drizzle";
    } else if ([61, 63, 65, 66, 67].includes(weatherCode)) {
      return "Rain";
    } else if ([71, 73, 75, 77].includes(weatherCode)) {
      return "Snow";
    } else if ([80, 81, 82].includes(weatherCode)) {
      return "Rain Showers";
    } else if ([95, 96, 99].includes(weatherCode)) {
      return "Thunderstorm";
    } else {
      return "Unknown";
    }
  } catch (error) {
    console.error("Weather condition calculation failed:", error);

    return "Unknown";
  }
}

function updateHourlyCards(times, temperatures, weatherCodes) {
  try {
    const container = document.getElementById("hourlyForecast");

    if (!container) {
      throw new Error("Hourly forecast container not found.");
    }

    container.innerHTML = "";

    times.forEach((time, index) => {
      const card = document.createElement("div");

      card.className = "mx-1 bg-light text-black rounded-3 p-1 text-center";

      card.style.minWidth = "80px";

      const formattedTime = new Date(time).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });

      const temperature = convertTemperature(temperatures[index]);

      const weatherCode = weatherCodes[index];

      const weatherIcon = getWeatherIcon(weatherCode);

      const weatherCondition = getWeatherCondition(weatherCode);

      card.innerHTML = `
        <p>${formattedTime}</p>
        <img src="${weatherIcon}" alt="Weather">
        <p>${temperature}°${temperatureUnit}</p>
        <p class="weather-condition">${weatherCondition}</p>
      `;

      container.appendChild(card);
    });
  } catch (error) {
    console.error("Hourly forecast update failed:", error);
  }
}

function updateDailyForecast(times, highs, lows, weatherCodes, precipitation) {
  try {
    const container = document.getElementById("dailyForecast");

    if (!container) {
      throw new Error("Daily forecast container not found.");
    }

    container.innerHTML = "";

    times.slice(0, 7).forEach((time, index) => {
      const card = document.createElement("div");

      card.className = "daily-card";

      const date = new Date(time);

      const dayName = date.toLocaleDateString("en-US", {
        weekday: "short",
      });

      const weatherCode = weatherCodes[index];

      const weatherIcon = getWeatherIcon(weatherCode);

      const weatherCondition = getWeatherCondition(weatherCode);

      const rainChance = precipitation[index];

      const minTemp = Math.min(...lows);
      const maxTemp = Math.max(...highs);

      const totalRange = maxTemp - minTemp;

      const startPosition =
        totalRange === 0 ? 0 : ((lows[index] - minTemp) / totalRange) * 100;

      const barWidth =
        totalRange === 0
          ? 50
          : ((highs[index] - lows[index]) / totalRange) * 100;

      card.innerHTML = `
        <div class="daily-day">${dayName}</div>

        <img
          class="daily-icon"
          src="${weatherIcon}"
          alt="${weatherCondition}"
        >

        <div class="daily-condition">
          ${weatherCondition}
        </div>

        <div class="temperature-bar">
          <div
            class="temperature-fill"
            style="
              width: ${barWidth}%;
              margin-left: ${startPosition}%;
            ">
          </div>
        </div>

        <div class="daily-rain">
          💧 ${rainChance}%
        </div>

        <div class="daily-temperature">
          <strong>
            ${convertTemperature(highs[index])}°${temperatureUnit}
          </strong>
          <span>
            ${convertTemperature(lows[index])}°${temperatureUnit}
          </span>
        </div>
      `;

      container.appendChild(card);
    });
  } catch (error) {
    console.error("Daily forecast update failed:", error);
  }
}

// Current Location

navigator.geolocation.getCurrentPosition(
  async (position) => {
    try {
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;

      const weather = await getCurrentWeather(latitude, longitude);

      const locationData = await getCityFromCoordinates(latitude, longitude);

      if (!locationData?.address) {
        throw new Error("Location address not available.");
      }

      const cityName =
        locationData.address.city ||
        locationData.address.town ||
        locationData.address.village ||
        locationData.address.municipality ||
        locationData.address.county ||
        "Your Location";

      const countryCode =
        locationData.address.country_code?.toUpperCase() || "";

      displayWeather(weather, cityName, countryCode);
    } catch (error) {
      console.error("Current location weather loading failed:", error);
    }
  },

  (error) => {
    console.error("Location permission denied or unavailable:", error);
  },
);

// City Search

const searchForm = document.getElementById("searchForm");

const citySearch = document.getElementById("citySearch");

if (searchForm && citySearch) {
  searchForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      const city = citySearch.value.trim();

      if (!city) {
        throw new Error("Please enter a city name.");
      }

      const cityData = await getCityCoordinates(city);

      if (!cityData) {
        throw new Error("City not found.");
      }

      const weather = await getCurrentWeather(
        cityData.latitude,
        cityData.longitude,
      );

      displayWeather(weather, cityData.name, cityData.country_code);
    } catch (error) {
      console.error("City search failed:", error);

      alert(error.message || "Could not load weather for this city.");
    }
  });
}

// Temperature Toggle

const temperatureToggle = document.getElementById("temperatureToggle");

if (temperatureToggle) {
  temperatureToggle.textContent =
    temperatureUnit === "C" ? "°F / °C" : "°C / °F";

  temperatureToggle.addEventListener("click", () => {
    try {
      if (!currentWeatherData) {
        throw new Error("Weather data is not available yet.");
      }

      temperatureUnit = temperatureUnit === "C" ? "F" : "C";

      localStorage.setItem("temperatureUnit", temperatureUnit);

      temperatureToggle.textContent =
        temperatureUnit === "C" ? "°F / °C" : "°C / °F";

      const cityText = document.getElementById("cityName")?.textContent || "";

      const parts = cityText.split(",");

      const cityName = parts[0]?.trim() || "";

      const countryCode = parts[1]?.trim() || "";

      displayWeather(currentWeatherData, cityName, countryCode);
    } catch (error) {
      console.error("Temperature toggle failed:", error);
    }
  });
}
