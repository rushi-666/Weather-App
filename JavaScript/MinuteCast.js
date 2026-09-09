import getCurrentWeather, {
  getCityCoordinates,
  getCityFromCoordinates,
} from "./api.js";

// CURRENT LOCATION

try {
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        const latitude = position.coords.latitude;

        const longitude = position.coords.longitude;

        const locationData = await getCityFromCoordinates(latitude, longitude);

        const cityName =
          locationData.address.city ||
          locationData.address.town ||
          locationData.address.village ||
          locationData.address.municipality ||
          locationData.address.county ||
          "Your Location";

        setMinuteCastLoading(true);

        const weather = await getCurrentWeather(latitude, longitude);

        updateMinuteCastTime(weather);
        updateMinuteCastStatus(weather);
        createMinuteCastGraph(weather);
        updateMinuteCastTimeAxis(weather);

        setMinuteCastLoading(false);

        const title = document.getElementById("minuteCastTitle");

        if (title) {
          title.textContent = `MinuteCast® — Next 60 Minutes · ${cityName}`;
        }
      } catch (error) {
        console.error("MinuteCast loading failed:", error);

        setMinuteCastLoading(false);
      }
    },

    (error) => {
      console.error("Geolocation failed:", error);

      console.log("Location permission denied or unavailable.");
    },
  );
} catch (error) {
  console.error("Geolocation setup failed:", error);
}

// SEARCH

try {
  const minuteCastSearchForm = document.getElementById("minuteCastSearchForm");

  const minuteCastCitySearch = document.getElementById("minuteCastCitySearch");

  if (minuteCastSearchForm && minuteCastCitySearch) {
    minuteCastSearchForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      try {
        const city = minuteCastCitySearch.value.trim();

        if (!city) {
          return;
        }

        const cityData = await getCityCoordinates(city);

        const latitude = cityData.latitude;

        const longitude = cityData.longitude;

        const cityName = cityData.name;

        setMinuteCastLoading(true);

        const weather = await getCurrentWeather(latitude, longitude);

        const title = document.getElementById("minuteCastTitle");

        if (title) {
          title.textContent = `MinuteCast® — Next 60 Minutes · ${cityName}`;
        }

        updateMinuteCastTime(weather);
        updateMinuteCastStatus(weather);
        createMinuteCastGraph(weather);
        updateMinuteCastTimeAxis(weather);
        updateMinuteCastRefreshStatus();

        setMinuteCastLoading(false);
      } catch (error) {
        console.error("MinuteCast city search failed:", error);

        setMinuteCastLoading(false);
      }
    });
  }
} catch (error) {
  console.error("MinuteCast search setup failed:", error);
}

// MINUTECAST STATUS

function updateMinuteCastStatus(weather) {
  try {
    const statusElement = document.getElementById("minuteCastStatus");

    if (!statusElement) {
      return;
    }

    const probabilities = weather.hourlyPrecipitation || [];

    const times = weather.hourlyTime || [];

    if (!probabilities.length || !times.length) {
      statusElement.textContent = "Precipitation data unavailable";

      return;
    }

    const currentTime = new Date(weather.time).getTime();

    let closestIndex = 0;

    let smallestDifference = Infinity;

    times.forEach((time, index) => {
      const forecastTime = new Date(time).getTime();

      const difference = Math.abs(forecastTime - currentTime);

      if (difference < smallestDifference) {
        smallestDifference = difference;

        closestIndex = index;
      }
    });

    const probability = probabilities[closestIndex] ?? 0;

    const forecastTime = new Date(times[closestIndex]);

    const formattedTime = forecastTime.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });

    if (probability >= 70) {
      statusElement.textContent = `High chance of precipitation around ${formattedTime} (${probability}%)`;
    } else if (probability >= 40) {
      statusElement.textContent = `Moderate chance of precipitation around ${formattedTime} (${probability}%)`;
    } else if (probability > 0) {
      statusElement.textContent = `Low chance of precipitation around ${formattedTime} (${probability}%)`;
    } else {
      statusElement.textContent =
        "No precipitation expected in the available forecast";
    }
  } catch (error) {
    console.error("MinuteCast status update failed:", error);
  }
}

// MINUTECAST GRAPH

function createMinuteCastGraph(weather) {
  try {
    const graph = document.getElementById("minuteCastGraph");

    if (!graph) {
      return;
    }

    graph.innerHTML = "";

    const probabilities = weather.hourlyPrecipitation || [];

    const times = weather.hourlyTime || [];

    if (!probabilities.length || !times.length) {
      return;
    }

    const currentTime = new Date(weather.time).getTime();

    let currentIndex = 0;

    for (let i = 0; i < times.length; i++) {
      const forecastTime = new Date(times[i]).getTime();

      if (forecastTime >= currentTime) {
        currentIndex = i;
        break;
      }
    }

    const currentProbability = probabilities[currentIndex] ?? 0;

    const nextProbability =
      probabilities[currentIndex + 1] ?? currentProbability;

    const barCount = 30;

    for (let i = 0; i < barCount; i++) {
      const progress = i / (barCount - 1);

      const barMinutes = i * 2;

      const barTime = new Date(currentTime + barMinutes * 60 * 1000);

      const formattedBarTime = barTime.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });

      const probability =
        currentProbability + (nextProbability - currentProbability) * progress;

      const currentAmount =
        weather.hourlyPrecipitationAmount?.[currentIndex] ?? 0;

      const nextAmount =
        weather.hourlyPrecipitationAmount?.[currentIndex + 1] ?? currentAmount;

      const precipitationAmount =
        currentAmount + (nextAmount - currentAmount) * progress;

      const height = Math.max(4, Math.min(probability * 1.2, 100));

      const bar = document.createElement("span");

      bar.style.flex = "1";
      bar.style.maxWidth = "8px";
      bar.style.height = `${height}px`;
      bar.style.borderRadius = "999px";
      bar.style.cursor = "pointer";

      bar.className = "minute-bar";

      if (precipitationAmount > 0) {
        bar.title = `${Math.round(
          probability,
        )}% chance · ~${precipitationAmount.toFixed(1)} mm/hr`;
      } else {
        bar.title = `${Math.round(probability)}% chance · No precipitation`;
      }

      const tooltip = document.getElementById("minuteCastTooltip");

      if (tooltip) {
        bar.addEventListener("mouseenter", () => {
          try {
            if (precipitationAmount > 0) {
              tooltip.textContent = `${Math.round(
                probability,
              )}% chance · ~${precipitationAmount.toFixed(1)} mm/hr`;
            } else {
              tooltip.textContent = `${Math.round(
                probability,
              )}% chance · No precipitation`;
            }

            tooltip.style.display = "block";
          } catch (error) {
            console.error("MinuteCast tooltip display failed:", error);
          }
        });

        bar.addEventListener("mousemove", (event) => {
          try {
            tooltip.style.left = `${event.clientX + 12}px`;

            tooltip.style.top = `${event.clientY - 35}px`;
          } catch (error) {
            console.error("MinuteCast tooltip position failed:", error);
          }
        });

        bar.addEventListener("mouseleave", () => {
          try {
            tooltip.style.display = "none";
          } catch (error) {
            console.error("MinuteCast tooltip hide failed:", error);
          }
        });
      }

      if (probability >= 70) {
        bar.style.backgroundColor = "#1d4ed8";
      } else if (probability >= 40) {
        bar.style.backgroundColor = "#0284c7";
      } else if (probability > 0) {
        bar.style.backgroundColor = "#38bdf8";
      }

      graph.appendChild(bar);
    }
  } catch (error) {
    console.error("MinuteCast graph creation failed:", error);
  }
}

// UPDATE TIME

function updateMinuteCastTime(weather) {
  try {
    const updatedElement = document.getElementById("minuteCastUpdated");

    const footerElement = document.getElementById("minuteCastFooterUpdated");

    const date = weather.time ? new Date(weather.time) : new Date();

    const formattedDate = date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });

    const formattedTime = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });

    const text = `Atmosphere · Updated ${formattedTime} · ${formattedDate}`;

    if (updatedElement) {
      updatedElement.textContent = text;
    }

    if (footerElement) {
      footerElement.textContent = text;
    }
  } catch (error) {
    console.error("MinuteCast time update failed:", error);
  }
}

// REFRESH STATUS

function updateMinuteCastRefreshStatus() {
  try {
    const element = document.getElementById("minuteCastRefreshStatus");

    if (!element) {
      return;
    }

    const now = new Date();

    const time = now.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });

    element.textContent = `Live · Updated ${time}`;
  } catch (error) {
    console.error("MinuteCast refresh status update failed:", error);
  }
}

// TIME AXIS

function updateMinuteCastTimeAxis(weather) {
  try {
    const axis = document.getElementById("minuteCastTimeAxis");

    if (!axis) {
      return;
    }

    const startTime = new Date(weather.time);

    const labels = [0, 15, 30, 45, 60];

    axis.innerHTML = "";

    labels.forEach((minutes, index) => {
      const label = document.createElement("span");

      const time = new Date(startTime.getTime() + minutes * 60 * 1000);

      label.textContent =
        index === 0
          ? "Now"
          : time.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            });

      axis.appendChild(label);
    });
  } catch (error) {
    console.error("MinuteCast time axis update failed:", error);
  }
}

// AUTO REFRESH
// EVERY 10 MINUTES

try {
  setInterval(
    async () => {
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });

        const latitude = position.coords.latitude;

        const longitude = position.coords.longitude;

        setMinuteCastLoading(true);

        const weather = await getCurrentWeather(latitude, longitude);

        updateMinuteCastTime(weather);

        updateMinuteCastStatus(weather);

        createMinuteCastGraph(weather);

        updateMinuteCastTimeAxis(weather);

        updateMinuteCastRefreshStatus();

        setMinuteCastLoading(false);
      } catch (error) {
        console.error("MinuteCast auto-refresh failed:", error);

        setMinuteCastLoading(false);
      }
    },
    10 * 60 * 1000,
  );
} catch (error) {
  console.error("MinuteCast auto-refresh setup failed:", error);
}

// LOADING STATUS

function setMinuteCastLoading(isLoading) {
  try {
    const statusElement = document.getElementById("minuteCastStatus");

    if (!statusElement) {
      return;
    }

    if (isLoading) {
      statusElement.textContent = "Loading precipitation forecast...";
    }
  } catch (error) {
    console.error("MinuteCast loading status update failed:", error);
  }
}
