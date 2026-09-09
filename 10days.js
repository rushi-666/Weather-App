import getCurrentWeather, {
  getCityCoordinates,
  getCityFromCoordinates,
} from "./api.js";

let temperatureUnit = localStorage.getItem("temperatureUnit") || "C";

let currentTenDayData = null;

// TEMPERATURE CONVERSION

function convertTemperature(celsius) {
  try {
    if (temperatureUnit === "F") {
      return Math.round((celsius * 9) / 5 + 32);
    }

    return Math.round(celsius);
  } catch (error) {
    console.error("Temperature conversion failed:", error);
    return celsius;
  }
}

// UPDATE 10-DAY FORECAST

function updateTenDayForecast(times, highs, lows, weatherCodes, precipitation) {
  try {
    currentTenDayData = {
      times,
      highs,
      lows,
      weatherCodes,
      precipitation,
    };

    const tbody = document.getElementById("tenDayForecast");

    if (!tbody) {
      throw new Error("10-day forecast table not found.");
    }

    tbody.innerHTML = "";

    const globalMin = Math.min(...lows);
    const globalMax = Math.max(...highs);

    times.slice(0, 10).forEach((time, index) => {
      const [year, month, day] = time.split("-").map(Number);

      const date = new Date(year, month - 1, day);

      const dayName =
        index === 0
          ? "Today"
          : date.toLocaleDateString("en-US", {
              weekday: "short",
            });

      const dateText = new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
      }).format(date);

      const low = convertTemperature(lows[index]);

      const high = convertTemperature(highs[index]);

      // Keep these calculations in Celsius.
      // This is important because globalMin/globalMax
      // are also in Celsius.

      const totalRange = globalMax - globalMin;

      const rangeWidth =
        totalRange === 0
          ? 50
          : Math.max(15, ((highs[index] - lows[index]) / totalRange) * 100);

      const rangeOffset =
        totalRange === 0 ? 0 : ((lows[index] - globalMin) / totalRange) * 100;

      const weatherIcon = getWeatherIcon(weatherCodes[index]);

      const weatherCondition = getWeatherCondition(weatherCodes[index]);

      const row = document.createElement("tr");

      row.innerHTML = `
        <td class="text-white fw-semibold">
          ${dayName}
          <span class="d-block small text-white-50">
            ${dateText}
          </span>
        </td>

        <td>
          <div class="d-flex align-items-center gap-2">
            <img
              src="${weatherIcon}"
              alt="${weatherCondition}"
              width="28"
              height="28"
            >

            <span class="small">
              ${weatherCondition}
            </span>
          </div>
        </td>

        <td class="text-info small fw-semibold">
          ${precipitation[index]}%
        </td>

        <td>
          <div
            class="progress"
            style="
              height: 6px;
              background-color: #1a2a3a;
            "
          >
            <div
              class="progress-bar"
              style="
                width:${rangeWidth}%;
                margin-left:${rangeOffset}%;
                background:linear-gradient(
                  90deg,
                  #4ea8de,
                  #ffb703
                );
              "
            ></div>
          </div>
        </td>

        <td class="text-white-50 text-end fs-5">
          ${low}°${temperatureUnit}
        </td>

        <td class="text-white fw-bold text-end fs-5">
          ${high}°${temperatureUnit}
        </td>
      `;

      tbody.appendChild(row);
    });
  } catch (error) {
    console.error("10-day forecast update failed:", error);
  }
}

// WEATHER ICON

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
    }

    return "media/cloudy.svg";
  } catch (error) {
    console.error("Weather icon selection failed:", error);

    return "media/cloudy.svg";
  }
}

// WEATHER CONDITION

function getWeatherCondition(weatherCode) {
  try {
    if (weatherCode === 0) {
      return "Clear";
    }

    if ([1, 2].includes(weatherCode)) {
      return "Partly Cloudy";
    }

    if (weatherCode === 3) {
      return "Cloudy";
    }

    if ([45, 48].includes(weatherCode)) {
      return "Fog";
    }

    if ([51, 53, 55, 56, 57].includes(weatherCode)) {
      return "Drizzle";
    }

    if ([61, 63, 65, 66, 67].includes(weatherCode)) {
      return "Rain";
    }

    if ([71, 73, 75, 77].includes(weatherCode)) {
      return "Snow";
    }

    if ([80, 81, 82].includes(weatherCode)) {
      return "Rain Showers";
    }

    if ([95, 96, 99].includes(weatherCode)) {
      return "Thunderstorm";
    }

    return "Unknown";
  } catch (error) {
    console.error("Weather condition detection failed:", error);

    return "Unknown";
  }
}

// CURRENT LOCATION WEATHER

try {
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        const latitude = position.coords.latitude;

        const longitude = position.coords.longitude;

        const weather = await getCurrentWeather(latitude, longitude);

        const locationData = await getCityFromCoordinates(latitude, longitude);

        const cityName =
          locationData.address.city ||
          locationData.address.town ||
          locationData.address.village ||
          locationData.address.municipality ||
          locationData.address.county ||
          "Your Location";

        document.getElementById("tenDayTitle").textContent =
          `10-Day Forecast - ${cityName}`;

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

        document.getElementById("tenDayUpdated").textContent =
          `Atmosphere · Updated ${formattedTime} · ${formattedDate}`;

        document.getElementById("tenDayFooterUpdated").textContent =
          `Atmosphere · Updated ${formattedTime} · ${formattedDate}`;

        updateTenDayForecast(
          weather.dailyTime,
          weather.dailyHigh,
          weather.dailyLow,
          weather.dailyWeatherCode,
          weather.dailyPrecipitation,
        );
      } catch (error) {
        console.error("Current location forecast loading failed:", error);

        alert("Could not load the 10-day forecast for your current location.");
      }
    },

    (error) => {
      console.error("Geolocation failed:", error);
    },
  );
} catch (error) {
  console.error("Geolocation setup failed:", error);
}

// CITY SEARCH

try {
  const searchForm = document.getElementById("searchForm");

  const citySearch = document.getElementById("citySearch");

  if (!searchForm || !citySearch) {
    throw new Error("Search form or city search input not found.");
  }

  searchForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      const city = citySearch.value.trim();

      if (!city) {
        return;
      }

      const cityData = await getCityCoordinates(city);

      const weather = await getCurrentWeather(
        cityData.latitude,
        cityData.longitude,
      );

      document.getElementById("tenDayTitle").textContent =
        `10-Day Forecast - ${cityData.name}`;

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

      document.getElementById("tenDayUpdated").textContent =
        `Atmosphere · Updated ${formattedTime} · ${formattedDate}`;

      document.getElementById("tenDayFooterUpdated").textContent =
        `Atmosphere · Updated ${formattedTime} · ${formattedDate}`;

      updateTenDayForecast(
        weather.dailyTime,
        weather.dailyHigh,
        weather.dailyLow,
        weather.dailyWeatherCode,
        weather.dailyPrecipitation,
      );
    } catch (error) {
      console.error("City search failed:", error);

      alert("Could not load the 10-day forecast for the searched city.");
    }
  });
} catch (error) {
  console.error("Search setup failed:", error);
}

// TEMPERATURE TOGGLE

try {
  const temperatureToggle = document.getElementById("temperatureToggle");

  if (!temperatureToggle) {
    throw new Error("Temperature toggle button not found.");
  }

  temperatureToggle.textContent =
    temperatureUnit === "C" ? "°F / °C" : "°C / °F";

  temperatureToggle.addEventListener("click", () => {
    try {
      temperatureUnit = temperatureUnit === "C" ? "F" : "C";

      localStorage.setItem("temperatureUnit", temperatureUnit);

      temperatureToggle.textContent =
        temperatureUnit === "C" ? "°F / °C" : "°C / °F";

      if (currentTenDayData) {
        updateTenDayForecast(
          currentTenDayData.times,
          currentTenDayData.highs,
          currentTenDayData.lows,
          currentTenDayData.weatherCodes,
          currentTenDayData.precipitation,
        );
      }
    } catch (error) {
      console.error("Temperature toggle failed:", error);
    }
  });
} catch (error) {
  console.error("Temperature toggle setup failed:", error);
}
