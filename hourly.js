import getCurrentWeather, {
  getCityCoordinates,
  getCityFromCoordinates,
} from "./api.js";

let temperatureUnit = localStorage.getItem("temperatureUnit") || "C";

let currentHourlyData = null;

 
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

 
// UPDATE HOURLY TABLE
 

function updateHourlyTable(
  times,
  temperatures,
  weatherCodes,
  precipitation,
  windSpeeds,
  humidity,
) {
  try {
    currentHourlyData = {
      times,
      temperatures,
      weatherCodes,
      precipitation,
      windSpeeds,
      humidity,
    };

    const tbody = document.getElementById("hourlyTableBody");

    if (!tbody) {
      throw new Error("Hourly table body not found.");
    }

    tbody.innerHTML = "";

    times.forEach((time, index) => {
      const row = document.createElement("tr");

      const formattedTime = new Date(time).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });

      const weatherIcon = getWeatherIcon(weatherCodes[index]);

      const rainChance = precipitation[index];

      const temperature = convertTemperature(temperatures[index]);

      row.innerHTML = `
        <td class="text-white fw-semibold">
          ${formattedTime}
        </td>

        <td>
          <img
            src="${weatherIcon}"
            alt="Weather"
            width="28"
            height="28"
          >
        </td>

        <td>
          <div class="d-flex align-items-center gap-2">
            <div class="progress flex-grow-1">
              <div
                class="progress-bar"
                style="width: ${rainChance}%"
              ></div>
            </div>

            <span class="small">
              ${rainChance}%
            </span>
          </div>
        </td>

        <td class="text-white fw-bold fs-5">
          ${temperature}°${temperatureUnit}
        </td>

        <td>
          ${windSpeeds[index]} km/h
        </td>

        <td>
          ${humidity[index]}%
        </td>
      `;

      tbody.appendChild(row);
    });
  } catch (error) {
    console.error("Hourly table update failed:", error);
  }
}

 
// GET CURRENT LOCATION WEATHER
 

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

        const countryCode =
          locationData.address.country_code?.toUpperCase() || "";

        document.getElementById("hourlyTitle").textContent =
          `HOUR-BY-HOUR — ${cityName.toUpperCase()}`;

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

        document.getElementById("hourlyUpdated").textContent =
          `Atmosphere · Updated ${formattedTime} · ${formattedDate}`;

        document.getElementById("footerUpdated").textContent =
          `Atmosphere · Updated ${formattedTime} · ${formattedDate}`;

        updateHourlyTable(
          weather.hourlyTime,
          weather.hourlyTemperature,
          weather.hourlyWeatherCode,
          weather.hourlyPrecipitation,
          weather.hourlyWindSpeed,
          weather.hourlyHumidity,
        );
      } catch (error) {
        console.error("Current location weather loading failed:", error);

        alert("Could not load weather for your current location.");
      }
    },

    (error) => {
      console.error("Geolocation failed:", error);
    },
  );
} catch (error) {
  console.error("Geolocation setup failed:", error);
}

 
// INITIAL UPDATED TIME
 

try {
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

  const hourlyUpdated = document.getElementById("hourlyUpdated");

  if (hourlyUpdated) {
    hourlyUpdated.textContent = `Atmosphere · Updated ${formattedTime} · ${formattedDate}`;
  }
} catch (error) {
  console.error("Initial updated time failed:", error);
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

      const cityName = cityData.name;

      const countryCode = cityData.country_code?.toUpperCase() || "";

      document.getElementById("hourlyTitle").textContent =
        `HOUR-BY-HOUR — ${cityName.toUpperCase()}`;

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

      document.getElementById("hourlyUpdated").textContent =
        `Atmosphere · Updated ${formattedTime} · ${formattedDate}`;

      updateHourlyTable(
        weather.hourlyTime,
        weather.hourlyTemperature,
        weather.hourlyWeatherCode,
        weather.hourlyPrecipitation,
        weather.hourlyWindSpeed,
        weather.hourlyHumidity,
      );
    } catch (error) {
      console.error("City search failed:", error);

      alert("Could not load weather for the searched city.");
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

      if (currentHourlyData) {
        updateHourlyTable(
          currentHourlyData.times,
          currentHourlyData.temperatures,
          currentHourlyData.weatherCodes,
          currentHourlyData.precipitation,
          currentHourlyData.windSpeeds,
          currentHourlyData.humidity,
        );
      }
    } catch (error) {
      console.error("Temperature toggle failed:", error);
    }
  });
} catch (error) {
  console.error("Temperature toggle setup failed:", error);
}
