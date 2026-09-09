import getCurrentWeather, {
  getCityCoordinates,
  getCityFromCoordinates,
} from "./api.js";

// GLOBAL VARIABLES

let radarMap;
let radarMarker;
let radarLayer;
let radarFrames = [];
let radarHost = "";
let cityBoundary;
let stormMotionLine;
let stormMotionHead;

let radarPlaying = false;
let radarPlayInterval;

// CURRENT LOCATION

try {
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        const latitude = position.coords.latitude;

        const longitude = position.coords.longitude;

        loadRadarMap(latitude, longitude);

        const locationData = await getCityFromCoordinates(latitude, longitude);

        const cityName =
          locationData.address.city ||
          locationData.address.town ||
          locationData.address.village ||
          locationData.address.municipality ||
          locationData.address.county ||
          "Your Location";

        const weather = await getCurrentWeather(latitude, longitude);

        const stormSpeed = Math.round(weather.windSpeed * 0.621371);

        const stormDirection = getWindDirectionName(weather.windDirection);

        const stormMotionValue = document.getElementById("stormMotionValue");

        if (stormMotionValue) {
          stormMotionValue.textContent = `${stormSpeed} mph ${stormDirection}`;
        }

        updateStormMotionArrow(
          latitude,
          longitude,
          weather.windDirection,
          weather.windSpeed,
        );

        loadCityBoundary(cityName);

        const radarTitle = document.getElementById("radarTitle");

        if (radarTitle) {
          radarTitle.textContent = `Radar - ${cityName}`;
        }

        const radarCardTitle = document.getElementById("radarCardTitle");

        if (radarCardTitle) {
          radarCardTitle.textContent = `Radar — ${cityName}`;
        }

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

        const radarUpdated = document.getElementById("radarUpdated");

        if (radarUpdated) {
          radarUpdated.textContent = `Atmosphere · Updated ${formattedTime} · ${formattedDate}`;
        }

        const radarFooterUpdated =
          document.getElementById("radarFooterUpdated");

        if (radarFooterUpdated) {
          radarFooterUpdated.textContent = `Atmosphere · Updated ${formattedTime} · ${formattedDate}`;
        }

        const radarLiveTime = document.getElementById("radarLiveTime");

        if (radarLiveTime) {
          radarLiveTime.textContent = `· ${formattedTime}`;
        }

        const radarLocation = document.getElementById("radarLocation");

        if (radarLocation) {
          radarLocation.textContent = cityName;
        }

        if (radarMarker) {
          radarMarker.setTooltipContent(cityName);
        }
      } catch (error) {
        console.error("Current location radar loading failed:", error);

        alert("Could not load radar information for your current location.");
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

// RADAR SEARCH

try {
  const radarSearchForm = document.getElementById("radarSearchForm");

  const radarCitySearch = document.getElementById("radarCitySearch");

  if (!radarSearchForm || !radarCitySearch) {
    throw new Error("Radar search form or input not found.");
  }

  radarSearchForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      const city = radarCitySearch.value.trim();

      if (!city) {
        return;
      }

      const cityData = await getCityCoordinates(city);

      const cityName = cityData.name;

      const latitude = cityData.latitude;

      const longitude = cityData.longitude;

      const weather = await getCurrentWeather(latitude, longitude);

      const stormSpeed = Math.round(weather.windSpeed * 0.621371);

      const stormDirection = getWindDirectionName(weather.windDirection);

      const stormMotionValue = document.getElementById("stormMotionValue");

      if (stormMotionValue) {
        stormMotionValue.textContent = `${stormSpeed} mph ${stormDirection}`;
      }

      if (radarMap) {
        radarMap.setView([latitude, longitude], 12);

        loadCityBoundary(cityName);

        if (radarMarker) {
          radarMarker.setLatLng([latitude, longitude]);

          radarMarker.setTooltipContent(cityName);
        } else {
          radarMarker = L.marker([latitude, longitude])
            .addTo(radarMap)
            .bindTooltip(cityName, {
              permanent: true,
              direction: "top",
              offset: [0, -10],
            });
        }
      }


      const radarTitle = document.getElementById("radarTitle");

      if (radarTitle) {
        radarTitle.textContent = `Radar - ${cityName}`;
      }

      const radarCardTitle = document.getElementById("radarCardTitle");

      if (radarCardTitle) {
        radarCardTitle.textContent = `Radar — ${cityName}`;
      }

      const radarLocation = document.getElementById("radarLocation");

      if (radarLocation) {
        radarLocation.textContent = cityName;
      }

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

      const radarUpdated = document.getElementById("radarUpdated");

      if (radarUpdated) {
        radarUpdated.textContent = `Atmosphere · Updated ${formattedTime} · ${formattedDate}`;
      }

      const radarLiveTime = document.getElementById("radarLiveTime");

      if (radarLiveTime) {
        radarLiveTime.textContent = `· ${formattedTime}`;
      }

      const radarFooterUpdated = document.getElementById("radarFooterUpdated");

      if (radarFooterUpdated) {
        radarFooterUpdated.textContent = `Atmosphere · Updated ${formattedTime} · ${formattedDate}`;
      }
    } catch (error) {
      console.error("Radar city search failed:", error);

      alert("Could not load radar information for the searched city.");
    }
  });
} catch (error) {
  console.error("Radar search setup failed:", error);
}

// LOAD RADAR MAP

async function loadRadarMap(latitude, longitude) {
  try {
    radarMap = L.map("radarMap", {
      zoomControl: true,
      worldCopyJump: false,
    }).setView([latitude, longitude], 12);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(radarMap);

    const response = await fetch(
      "https://api.rainviewer.com/public/weather-maps.json",
    );

    if (!response.ok) {
      throw new Error("Could not load radar data.");
    }

    const data = await response.json();

    radarHost = data.host;

    radarFrames = data.radar?.past || [];

    if (!radarFrames.length) {
      console.log("No radar frames available.");
      return;
    }

    const timeline = document.getElementById("radarTimeline");

    if (!timeline) {
      throw new Error("Radar timeline not found.");
    }

    timeline.min = 0;

    timeline.max = radarFrames.length - 1;

    timeline.value = radarFrames.length - 1;

    showRadarFrame(radarFrames.length - 1, data.host);
  } catch (error) {
    console.error("Radar loading failed:", error);
  }
}

// LOAD CITY BOUNDARY

async function loadCityBoundary(cityName) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=geojson&q=${encodeURIComponent(
        cityName,
      )}&polygon_geojson=1&limit=1`,
    );

    if (!response.ok) {
      throw new Error("Could not load city boundary.");
    }

    const data = await response.json();

    if (!data.features || !data.features.length) {
      console.log("No city boundary available.");
      return;
    }

    const geometry = data.features[0].geometry;

    if (cityBoundary) {
      radarMap.removeLayer(cityBoundary);
    }

    cityBoundary = L.geoJSON(geometry, {
      style: {
        color: "#ffffff",
        weight: 2,
        fill: false,
        opacity: 0.8,
        dashArray: "6 6",
      },
    }).addTo(radarMap);

    cityBoundary.bringToFront();
  } catch (error) {
    console.error("City boundary loading failed:", error);
  }
}

// SHOW RADAR FRAME

function showRadarFrame(index, host) {
  try {
    const frame = radarFrames[index];

    if (!frame) {
      return;
    }

    const radarTileUrl = `${host}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`;

    if (radarLayer) {
      radarMap.removeLayer(radarLayer);
    }

    radarLayer = L.tileLayer(radarTileUrl, {
      opacity: 0.55,
      maxNativeZoom: 7,
      maxZoom: 19,
      attribution: "Weather data by RainViewer",
    }).addTo(radarMap);

    const frameTime = new Date(frame.time * 1000);

    const radarFrameTime = document.getElementById("radarFrameTime");

    if (radarFrameTime) {
      radarFrameTime.textContent = frameTime.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
    }
  } catch (error) {
    console.error("Radar frame display failed:", error);
  }
}

// RADAR TIMELINE

try {
  const radarTimeline = document.getElementById("radarTimeline");

  if (!radarTimeline) {
    throw new Error("Radar timeline not found.");
  }

  radarTimeline.addEventListener("input", (event) => {
    try {
      const index = Number(event.target.value);

      showRadarFrame(index, radarHost);
    } catch (error) {
      console.error("Radar timeline update failed:", error);
    }
  });
} catch (error) {
  console.error("Radar timeline setup failed:", error);
}

// RADAR PLAY / PAUSE

try {
  const radarPlay = document.getElementById("radarPlay");

  const radarTimeline = document.getElementById("radarTimeline");

  if (!radarPlay || !radarTimeline) {
    throw new Error("Radar play button or timeline not found.");
  }

  radarPlay.addEventListener("click", async () => {
    try {
      if (radarPlaying) {
        radarPlaying = false;

        clearInterval(radarPlayInterval);

        radarPlay.textContent = "▶ Play";

        return;
      }

      radarPlaying = true;

      radarPlay.textContent = "⏸ Pause";

      radarPlayInterval = setInterval(() => {
        try {
          let nextIndex = Number(radarTimeline.value) + 1;

          if (nextIndex > radarFrames.length - 1) {
            nextIndex = 0;
          }

          radarTimeline.value = nextIndex;

          showRadarFrame(nextIndex, radarHost);
        } catch (error) {
          console.error("Radar animation frame failed:", error);
        }
      }, 800);
    } catch (error) {
      console.error("Radar play/pause failed:", error);
    }
  });
} catch (error) {
  console.error("Radar play button setup failed:", error);
}

// WIND DIRECTION

function getWindDirectionName(degrees) {
  try {
    const directions = [
      "N",
      "NNE",
      "NE",
      "ENE",
      "E",
      "ESE",
      "SE",
      "SSE",
      "S",
      "SSW",
      "SW",
      "WSW",
      "W",
      "WNW",
      "NW",
      "NNW",
    ];

    const index = Math.round(degrees / 22.5) % 16;

    return directions[index];
  } catch (error) {
    console.error("Wind direction calculation failed:", error);

    return "N";
  }
}

// STORM MOTION ARROW

function updateStormMotionArrow(latitude, longitude, degrees, speed) {
  try {
    if (stormMotionLine) {
      radarMap.removeLayer(stormMotionLine);
    }

    if (stormMotionHead) {
      radarMap.removeLayer(stormMotionHead);
    }

    if (!speed || speed < 5) {
      return;
    }

    const speedFactor = Math.max(0.08, Math.min(speed / 100, 0.35));

    const distance = speedFactor;

    const angle = ((degrees + 180) * Math.PI) / 180;

    const endLat = latitude + Math.cos(angle) * distance;

    const endLng = longitude + Math.sin(angle) * distance;

    // Motion line
    stormMotionLine = L.polyline(
      [
        [latitude, longitude],
        [endLat, endLng],
      ],
      {
        color: "#ff3b30",
        weight: 4,
        opacity: 0.9,
      },
    ).addTo(radarMap);

    // Arrow head
    stormMotionHead = L.marker([endLat, endLng], {
      icon: L.divIcon({
        className: "storm-arrow-head",

        html: `<span style="display:block; transform:rotate(${degrees + 180}deg);">➤</span>`,

        iconSize: [24, 24],

        iconAnchor: [12, 12],
      }),
    }).addTo(radarMap);

    stormMotionLine.bringToFront();

    stormMotionHead.setZIndexOffset(1000);
  } catch (error) {
    console.error("Storm motion arrow update failed:", error);
  }
}

// ECHO TOP

function updateEchoTop(value) {
  try {
    const element = document.getElementById("echoTopValue");

    if (!element) {
      return;
    }

    if (value === null || value === undefined) {
      element.textContent = "--";
      return;
    }

    element.textContent = `${Math.round(value).toLocaleString()} ft`;
  } catch (error) {
    console.error("Echo Top update failed:", error);
  }
}

// VIL

function updateVIL(value) {
  try {
    const element = document.getElementById("vilValue");

    if (!element) {
      return;
    }

    if (value === null || value === undefined) {
      element.textContent = "--";
      return;
    }

    element.textContent = `${Math.round(value)} kg/m²`;
  } catch (error) {
    console.error("VIL update failed:", error);
  }
}
