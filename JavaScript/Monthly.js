import getCurrentWeather, {
  getMonthlyWeather,
  getMonthlyEstimate,
  getPastMonthlyWeather,
  getCityCoordinates,
  getCityFromCoordinates,
} from "./api.js";

// Monthly Cast State

// Monthly Cast State

let monthlyLatitude = null;
let monthlyLongitude = null;
let monthlyCityName = "";

let monthlyWeatherData = null;
let monthlyEstimateData = null;
let pastMonthlyWeatherData = null;

// Temperature Unit
let temperatureUnit = localStorage.getItem("temperatureUnit") || "C";

function convertTemperature(celsius) {
  if (temperatureUnit === "F") {
    return Math.round((celsius * 9) / 5 + 32);
  }

  return Math.round(celsius);
}

let todayActualWeather = null;

let todayObservedHigh = null;
let todayObservedLow = null;

let displayedMonth = null;
let displayedYear = null;

// Cache monthly API results
const monthlyCache = new Map();

// Prevent multiple month requests at the same time
let monthlyLoading = false;

// Prevent repeated historical estimate requests
let estimateDataLoaded = false;

// Default Current Location

navigator.geolocation.getCurrentPosition(
  async (position) => {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;

    try {
      monthlyLatitude = latitude;
      monthlyLongitude = longitude;

      // Get city name

      const locationData = await getCityFromCoordinates(latitude, longitude);

      const cityName =
        locationData.address.city ||
        locationData.address.town ||
        locationData.address.village ||
        locationData.address.municipality ||
        locationData.address.county ||
        "Your Location";

      monthlyCityName = cityName;

      // Footer
      updateFooterLiveStatus();

      // Avoid creating multiple footer intervals
      if (!window.monthlyFooterInterval) {
        window.monthlyFooterInterval = setInterval(
          updateFooterLiveStatus,
          60000,
        );
      }

      // Set current month

      const today = new Date();

      displayedMonth = today.getMonth();
      displayedYear = today.getFullYear();

      // Load only the data needed for current month

      await loadSelectedMonthData();

      // Get today's actual weather

      todayActualWeather = await getCurrentWeather(latitude, longitude);

      // Reset today's observations
      todayObservedHigh = null;
      todayObservedLow = null;

      // Add current temperature
      updateTodayObservedTemperature(todayActualWeather);

      // Create calendar

      createMonthlyCalendar(getCalendarWeatherData());

      updateDisplayedMonthTitle();
    } catch (error) {
      console.error("Monthly weather loading failed:", error);
    }
  },

  (error) => {
    console.log("Location permission denied or unavailable.");
  },
);

// Create Monthly Calendar

function createMonthlyCalendar(weather) {
  try {
    const calendar = document.getElementById("monthlyCalendar");

    if (!calendar) {
      throw new Error("Monthly calendar not found.");
    }

    calendar.innerHTML = "";

    const dates = weather?.dailyTime || [];

    const highs = weather?.dailyHigh || [];

    const lows = weather?.dailyLow || [];

    const weatherCodes = weather?.dailyWeatherCode || [];

    if (displayedYear === null || displayedMonth === null) {
      return;
    }

    const year = displayedYear;
    const month = displayedMonth;

    const firstDay = new Date(year, month, 1).getDay();

    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      const emptyDay = document.createElement("div");

      emptyDay.className = "empty-day";

      calendar.appendChild(emptyDay);
    }

    // Calendar days
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDateString = `${year}-${String(month + 1).padStart(
        2,
        "0",
      )}-${String(day).padStart(2, "0")}`;

      const dayStatus = getDayStatus(currentDateString);

      const weatherDay = document.createElement("div");

      weatherDay.className = "weather-day";

      weatherDay.dataset.status = dayStatus;

      // Highlight today
      const today = new Date();

      if (
        day === today.getDate() &&
        month === today.getMonth() &&
        year === today.getFullYear()
      ) {
        weatherDay.classList.add("today");
      }

      // Find forecast data
      const dateIndex = dates.findIndex((date) => {
        const forecastDate = new Date(date);

        return (
          forecastDate.getFullYear() === year &&
          forecastDate.getMonth() === month &&
          forecastDate.getDate() === day
        );
      });

      let icon = null;
      let high = "—";
      let low = "—";

      // Forecast data
      if (dateIndex !== -1) {
        if (weatherCodes[dateIndex] != null) {
          icon = getWeatherIcon(weatherCodes[dateIndex]);
        }

        if (highs[dateIndex] != null) {
          high = `${convertTemperature(highs[dateIndex])}°${temperatureUnit}`;
        }

        if (lows[dateIndex] != null) {
          low = `${convertTemperature(lows[dateIndex])}°${temperatureUnit}`;
        }
      }

      // Future day
      if (dayStatus === "future") {
        const estimated = calculateHistoricalEstimate(currentDateString);

        if (estimated) {
          high = `${convertTemperature(estimated.high)}°${temperatureUnit}`;

          low = `${convertTemperature(estimated.low)}°${temperatureUnit}`;

          if (
            estimated.weatherCode !== null &&
            estimated.weatherCode !== undefined
          ) {
            icon = getWeatherIcon(estimated.weatherCode);
          }
        }
      }

      // Past day
      if (dayStatus === "past") {
        const pastDates = pastMonthlyWeatherData?.dailyTime || [];

        const pastHighs = pastMonthlyWeatherData?.dailyHigh || [];

        const pastLows = pastMonthlyWeatherData?.dailyLow || [];

        const pastWeatherCodes = pastMonthlyWeatherData?.dailyWeatherCode || [];

        const pastIndex = pastDates.findIndex((date) => {
          const pastDate = new Date(date);

          return (
            pastDate.getFullYear() === year &&
            pastDate.getMonth() === month &&
            pastDate.getDate() === day
          );
        });

        if (pastIndex !== -1) {
          if (pastHighs[pastIndex] != null) {
            high = `${convertTemperature(
              pastHighs[pastIndex],
            )}°${temperatureUnit}`;
          }

          if (pastLows[pastIndex] != null) {
            low = `${convertTemperature(
              pastLows[pastIndex],
            )}°${temperatureUnit}`;
          }

          if (pastWeatherCodes[pastIndex] != null) {
            icon = getWeatherIcon(pastWeatherCodes[pastIndex]);
          }
        }
      }

      // Today → dynamic actual data
      if (dayStatus === "today") {
        if (todayObservedHigh !== null) {
          high = `${convertTemperature(todayObservedHigh)}°${temperatureUnit}`;
        }

        if (todayObservedLow !== null) {
          low = `${convertTemperature(todayObservedLow)}°${temperatureUnit}`;
        }

        if (todayActualWeather?.weatherCode != null) {
          icon = getWeatherIcon(todayActualWeather.weatherCode);
        }
      }

      // Calendar HTML
      weatherDay.innerHTML = `
        <p>${day}</p>

        <p class="monthly-icon-container"></p>

        <p>${high} / ${low}</p>
      `;

      const iconContainer = weatherDay.querySelector(".monthly-icon-container");

      if (icon) {
        const iconElement = document.createElement("img");

        iconElement.src = icon;
        iconElement.alt = "Weather";
        iconElement.className = "monthly-weather-icon";

        iconContainer.appendChild(iconElement);
      } else {
        iconContainer.textContent = "—";
      }

      calendar.appendChild(weatherDay);
    }
  } catch (error) {
    console.error("Monthly calendar creation failed:", error);
  }
}

// Weather Icons

function getWeatherIcon(weatherCode) {
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
}

// Monthly Title

function updateMonthlyTitle(weather, cityName) {
  const titleElement = document.getElementById("monthlyTitle");

  if (!titleElement) {
    return;
  }

  if (displayedYear === null || displayedMonth === null) {
    return;
  }

  const date = new Date(displayedYear, displayedMonth, 1);

  const monthName = date.toLocaleDateString("en-US", {
    month: "long",
  });

  titleElement.textContent = `Monthly Forecast — ${monthName} ${displayedYear} · ${cityName}`;
}

// City Search

const monthlySearchForm = document.getElementById("monthlySearchForm");

const monthlyCitySearch = document.getElementById("monthlyCitySearch");

if (monthlySearchForm && monthlyCitySearch) {
  monthlySearchForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const city = monthlyCitySearch.value.trim();

    if (!city) {
      return;
    }

    if (monthlyLoading) {
      return;
    }

    monthlyLoading = true;

    try {
      const cityData = await getCityCoordinates(city);

      if (!cityData) {
        throw new Error("City not found.");
      }

      const latitude = cityData.latitude;

      const longitude = cityData.longitude;

      const cityName = cityData.name;

      // Update location

      monthlyLatitude = latitude;

      monthlyLongitude = longitude;

      monthlyCityName = cityName;

      // Reset location-specific data

      monthlyWeatherData = null;

      monthlyEstimateData = null;

      pastMonthlyWeatherData = null;

      estimateDataLoaded = false;

      monthlyCache.clear();

      todayActualWeather = null;

      todayObservedHigh = null;

      todayObservedLow = null;

      // Update footer

      updateFooterLiveStatus();

      // Current month

      const today = new Date();

      displayedMonth = today.getMonth();

      displayedYear = today.getFullYear();

      // Load selected month

      await loadSelectedMonthData();

      // Get today's actual weather

      todayActualWeather = await getCurrentWeather(latitude, longitude);

      todayObservedHigh = null;

      todayObservedLow = null;

      updateTodayObservedTemperature(todayActualWeather);

      // Draw calendar

      createMonthlyCalendar(getCalendarWeatherData());

      updateDisplayedMonthTitle();
    } catch (error) {
      console.error("Monthly city search failed:", error);
    } finally {
      monthlyLoading = false;
    }
  });
}

// Previous Month

const previousMonthButton = document.getElementById("previousMonth");

if (previousMonthButton) {
  previousMonthButton.addEventListener("click", async () => {
    if (displayedMonth === null || displayedYear === null) {
      return;
    }

    if (monthlyLoading) {
      return;
    }

    // Change month

    displayedMonth--;

    if (displayedMonth < 0) {
      displayedMonth = 11;
      displayedYear--;
    }

    monthlyLoading = true;

    try {
      await loadSelectedMonthData();

      createMonthlyCalendar(getCalendarWeatherData());

      updateDisplayedMonthTitle();
    } catch (error) {
      console.error("Previous month loading failed:", error);
    } finally {
      monthlyLoading = false;
    }
  });
}

// Next Month

const nextMonthButton = document.getElementById("nextMonth");

if (nextMonthButton) {
  nextMonthButton.addEventListener("click", async () => {
    if (displayedMonth === null || displayedYear === null) {
      return;
    }

    if (monthlyLoading) {
      return;
    }

    // Change month

    displayedMonth++;

    if (displayedMonth > 11) {
      displayedMonth = 0;
      displayedYear++;
    }

    monthlyLoading = true;

    try {
      await loadSelectedMonthData();

      createMonthlyCalendar(getCalendarWeatherData());

      updateDisplayedMonthTitle();
    } catch (error) {
      console.error("Next month loading failed:", error);
    } finally {
      monthlyLoading = false;
    }
  });
}

// Update Displayed Month Title

function updateDisplayedMonthTitle() {
  const titleElement = document.getElementById("monthlyTitle");

  if (!titleElement) {
    return;
  }

  if (displayedYear === null || displayedMonth === null) {
    return;
  }

  const date = new Date(displayedYear, displayedMonth, 1);

  const monthName = date.toLocaleDateString("en-US", {
    month: "long",
  });

  titleElement.textContent = `Monthly Forecast — ${monthName} ${displayedYear} · ${monthlyCityName}`;
}

// Date Helpers

function formatDate(date) {
  return [
    date.getFullYear(),

    String(date.getMonth() + 1).padStart(2, "0"),

    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function isPastMonth() {
  const today = new Date();

  const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const selectedMonth = new Date(displayedYear, displayedMonth, 1);

  return selectedMonth < currentMonth;
}

function isCurrentMonth() {
  const today = new Date();

  return (
    displayedYear === today.getFullYear() && displayedMonth === today.getMonth()
  );
}

function isFutureMonth() {
  const today = new Date();

  const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const selectedMonth = new Date(displayedYear, displayedMonth, 1);

  return selectedMonth > currentMonth;
}

// Load Selected Month

async function loadSelectedMonthData() {
  // Past month

  if (isPastMonth()) {
    monthlyWeatherData = null;

    monthlyEstimateData = null;

    await loadPastMonthlyWeather();

    return;
  }

  // Future month

  if (isFutureMonth()) {
    monthlyWeatherData = null;

    pastMonthlyWeatherData = null;

    await loadMonthlyEstimateData();

    return;
  }

  // Current month

  monthlyEstimateData = null;

  await loadMonthlyWeather();

  await loadPastMonthlyWeather();

  // Current month also needs historical data
  // for days beyond the available forecast.

  await loadMonthlyEstimateData();
}

// Get Calendar Data

function getCalendarWeatherData() {
  // Past month

  if (isPastMonth()) {
    return {
      dailyTime: pastMonthlyWeatherData?.dailyTime || [],

      dailyHigh: pastMonthlyWeatherData?.dailyHigh || [],

      dailyLow: pastMonthlyWeatherData?.dailyLow || [],

      dailyWeatherCode: pastMonthlyWeatherData?.dailyWeatherCode || [],
    };
  }

  // Future month

  if (isFutureMonth()) {
    return {
      dailyTime: [],
      dailyHigh: [],
      dailyLow: [],
      dailyWeatherCode: [],
    };
  }

  // Current month

  return (
    monthlyWeatherData || {
      dailyTime: [],
      dailyHigh: [],
      dailyLow: [],
      dailyWeatherCode: [],
    }
  );
}

// Cache Key

function getMonthlyCacheKey(type) {
  return `${type}_${monthlyLatitude}_${monthlyLongitude}_${displayedYear}_${displayedMonth}`;
}

// Load Historical Estimate Data

async function loadMonthlyEstimateData() {
  if (monthlyLatitude === null || monthlyLongitude === null) {
    return;
  }

  // Estimates are needed for:
  // 1. Future months
  // 2. Future days of current month

  if (!isFutureMonth() && !isCurrentMonth()) {
    monthlyEstimateData = null;

    return;
  }

  // Already loaded

  if (estimateDataLoaded && monthlyEstimateData) {
    return;
  }

  const today = new Date();

  const currentYear = today.getFullYear();

  // Previous five complete years
  const startDate = `${currentYear - 5}-01-01`;

  // Archive API has a small delay.
  // Never request yesterday + 1 or today.

  const latestAvailableDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - 1,
  );

  const endDate = formatDate(latestAvailableDate);

  try {
    monthlyEstimateData = await getMonthlyEstimate(
      monthlyLatitude,
      monthlyLongitude,
      startDate,
      endDate,
    );

    estimateDataLoaded = true;
  } catch (error) {
    console.error("Monthly estimate data loading failed:", error);

    monthlyEstimateData = null;

    estimateDataLoaded = false;
  }
}

// Calculate Historical Estimate

function calculateHistoricalEstimate(targetDate) {
  if (!monthlyEstimateData?.dailyTime?.length) {
    return null;
  }

  const target = new Date(targetDate);

  const targetMonth = target.getMonth();

  const targetDay = target.getDate();

  const highs = [];
  const lows = [];
  const weatherCodes = [];

  monthlyEstimateData.dailyTime.forEach((date, index) => {
    const historicalDate = new Date(date);

    if (
      historicalDate.getMonth() === targetMonth &&
      historicalDate.getDate() === targetDay
    ) {
      const high = monthlyEstimateData.dailyHigh?.[index];

      const low = monthlyEstimateData.dailyLow?.[index];

      const weatherCode = monthlyEstimateData.dailyWeatherCode?.[index];

      if (high != null && low != null) {
        highs.push(high);

        lows.push(low);
      }

      if (weatherCode != null) {
        weatherCodes.push(weatherCode);
      }
    }
  });

  if (!highs.length || !lows.length) {
    return null;
  }

  // Average High

  const averageHigh =
    highs.reduce((sum, value) => sum + value, 0) / highs.length;

  // Average Low

  const averageLow = lows.reduce((sum, value) => sum + value, 0) / lows.length;

  // Most common weather code

  let mostCommonWeatherCode = null;

  if (weatherCodes.length) {
    const codeCount = {};

    weatherCodes.forEach((code) => {
      codeCount[code] = (codeCount[code] || 0) + 1;
    });

    mostCommonWeatherCode = Object.keys(codeCount).sort(
      (a, b) => codeCount[b] - codeCount[a],
    )[0];

    mostCommonWeatherCode = Number(mostCommonWeatherCode);
  }

  return {
    high: averageHigh,

    low: averageLow,

    weatherCode: mostCommonWeatherCode,
  };
}

// Load Monthly Forecast

async function loadMonthlyWeather() {
  if (
    monthlyLatitude === null ||
    monthlyLongitude === null ||
    displayedMonth === null ||
    displayedYear === null
  ) {
    return;
  }

  const cacheKey = getMonthlyCacheKey("forecast");

  // Cache

  if (monthlyCache.has(cacheKey)) {
    monthlyWeatherData = monthlyCache.get(cacheKey);

    return;
  }

  const today = new Date();

  const selectedFirstDay = new Date(displayedYear, displayedMonth, 1);

  const selectedLastDay = new Date(displayedYear, displayedMonth + 1, 0);

  const currentMonthFirstDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    1,
  );

  // Past month

  if (selectedFirstDay < currentMonthFirstDay) {
    monthlyWeatherData = {
      dailyTime: [],
      dailyHigh: [],
      dailyLow: [],
      dailyWeatherCode: [],
      dailyPrecipitation: [],
    };

    return;
  }

  let startDate = selectedFirstDay;

  let endDate = selectedLastDay;

  // Current month

  if (selectedFirstDay.getTime() === currentMonthFirstDay.getTime()) {
    // Get today's date plus available
    // future forecast days.

    const forecastEndDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 15,
    );

    endDate =
      forecastEndDate < selectedLastDay ? forecastEndDate : selectedLastDay;
  }

  // Completely future month

  const nextMonthFirstDay = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    1,
  );

  if (selectedFirstDay >= nextMonthFirstDay) {
    monthlyWeatherData = {
      dailyTime: [],
      dailyHigh: [],
      dailyLow: [],
      dailyWeatherCode: [],
      dailyPrecipitation: [],
    };

    return;
  }

  try {
    const weather = await getMonthlyWeather(
      monthlyLatitude,
      monthlyLongitude,
      formatDate(startDate),
      formatDate(endDate),
    );

    monthlyWeatherData = weather;

    monthlyCache.set(cacheKey, weather);
  } catch (error) {
    console.error("Monthly weather loading failed:", error);

    monthlyWeatherData = {
      dailyTime: [],
      dailyHigh: [],
      dailyLow: [],
      dailyWeatherCode: [],
      dailyPrecipitation: [],
    };
  }
}

// Load Past Monthly Weather

async function loadPastMonthlyWeather() {
  if (
    monthlyLatitude === null ||
    monthlyLongitude === null ||
    displayedMonth === null ||
    displayedYear === null
  ) {
    return;
  }

  if (!isPastMonth() && !isCurrentMonth()) {
    pastMonthlyWeatherData = null;

    return;
  }

  const cacheKey = getMonthlyCacheKey("past");

  // Cache

  if (monthlyCache.has(cacheKey)) {
    pastMonthlyWeatherData = monthlyCache.get(cacheKey);

    return;
  }

  const today = new Date();

  const firstDay = new Date(displayedYear, displayedMonth, 1);

  const lastDay = new Date(displayedYear, displayedMonth + 1, 0);

  // Yesterday
  const yesterday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - 1,
  );

  // Don't request future dates

  if (firstDay > yesterday) {
    pastMonthlyWeatherData = null;

    return;
  }

  // Only completed days
  const endDate = lastDay < yesterday ? lastDay : yesterday;

  try {
    pastMonthlyWeatherData = await getPastMonthlyWeather(
      monthlyLatitude,
      monthlyLongitude,
      formatDate(firstDay),
      formatDate(endDate),
    );

    monthlyCache.set(cacheKey, pastMonthlyWeatherData);
  } catch (error) {
    console.error("Past monthly weather loading failed:", error);

    pastMonthlyWeatherData = null;
  }
}

// Determine Day Status

function getDayStatus(dateString) {
  const date = new Date(`${dateString}T00:00:00`);

  const today = new Date();

  const todayDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  const calendarDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );

  if (calendarDate < todayDate) {
    return "past";
  }

  if (calendarDate.getTime() === todayDate.getTime()) {
    return "today";
  }

  return "future";
}

// Update Today's Observed Temperature

function updateTodayObservedTemperature(weather) {
  const temperature = weather?.temperature;

  if (temperature == null) {
    return;
  }

  if (todayObservedHigh === null) {
    todayObservedHigh = temperature;
  } else {
    todayObservedHigh = Math.max(todayObservedHigh, temperature);
  }

  if (todayObservedLow === null) {
    todayObservedLow = temperature;
  } else {
    todayObservedLow = Math.min(todayObservedLow, temperature);
  }
}

// Refresh Today's Actual Weather

async function refreshTodayActualWeather() {
  if (monthlyLatitude === null || monthlyLongitude === null) {
    return;
  }

  try {
    const weather = await getCurrentWeather(monthlyLatitude, monthlyLongitude);

    todayActualWeather = weather;

    updateTodayObservedTemperature(weather);

    // Redraw using whichever data
    // belongs to the currently selected month.

    createMonthlyCalendar(getCalendarWeatherData());
  } catch (error) {
    console.error("Today's weather update failed:", error);
  }
}

// Automatic Refresh Every 10 Minutes

setInterval(refreshTodayActualWeather, 10 * 60 * 1000);

// Footer Live Status

function updateFooterLiveStatus() {
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
}

// Temperature Toggle

const temperatureToggle = document.getElementById("temperatureToggle");

if (temperatureToggle) {
  temperatureToggle.textContent =
    temperatureUnit === "C" ? "°F / °C" : "°C / °F";

  temperatureToggle.addEventListener("click", () => {
    temperatureUnit = temperatureUnit === "C" ? "F" : "C";

    localStorage.setItem("temperatureUnit", temperatureUnit);

    temperatureToggle.textContent =
      temperatureUnit === "C" ? "°F / °C" : "°C / °F";

    createMonthlyCalendar(getCalendarWeatherData());
  });
}
