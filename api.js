export async function getCityCoordinates(city) {
  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`,
    );
    if (!response.ok) {
      throw new Error("Could not find city.");
    }
    const data = await response.json();
    if (!data.results || data.results.length === 0) {
      throw new Error("City not found.");
    }
    return data.results[0];
  } catch (error) {
    console.error("City coordinates loading failed:", error);
    throw new Error("Could not find the requested city.");
  }
}

export async function getCityFromCoordinates(latitude, longitude) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
    );
    if (!response.ok) {
      throw new Error("Could not find your location.");
    }
    const data = await response.json();
    if (!data || !data.address) {
      throw new Error("Location information not available.");
    }
    return data;
  } catch (error) {
    console.error("Reverse geocoding failed:", error);
    throw new Error("Could not determine your current location.");
  }
}

export default async function getCurrentWeather(latitude, longitude) {
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,wind_speed_10m,wind_direction_10m,weather_code,relative_humidity_2m,visibility,surface_pressure,uv_index,dew_point_2m&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,precipitation_probability,precipitation&forecast_days=10&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max`,
    );
    const data = await response.json();
    return {
      temperature: data.current.temperature_2m,
      feelsLike: data.current.apparent_temperature,
      windSpeed: data.current.wind_speed_10m,
      humidity: data.current.relative_humidity_2m,
      weatherCode: data.current.weather_code,
      high: data.daily.temperature_2m_max[0],
      low: data.daily.temperature_2m_min[0],
      visibility: data.current.visibility,
      pressure: data.current.surface_pressure,
      uvIndex: data.current.uv_index,
      dewPoint: data.current.dew_point_2m,
      time: data.current.time,
      timezone: data.timezone,
      windDirection: data.current.wind_direction_10m,
      hourlyTime: data.hourly.time,
      hourlyTemperature: data.hourly.temperature_2m,
      hourlyWeatherCode: data.hourly.weather_code,
      dailyTime: data.daily.time,
      dailyHigh: data.daily.temperature_2m_max,
      dailyLow: data.daily.temperature_2m_min,
      dailyWeatherCode: data.daily.weather_code,
      dailyPrecipitation: data.daily.precipitation_probability_max,
      hourlyTime: data.hourly.time,
      hourlyTemperature: data.hourly.temperature_2m,
      hourlyWeatherCode: data.hourly.weather_code,
      hourlyHumidity: data.hourly.relative_humidity_2m,
      hourlyWindSpeed: data.hourly.wind_speed_10m,
      hourlyPrecipitation: data.hourly.precipitation_probability,
      hourlyPrecipitationAmount: data.hourly.precipitation,
    };
  } catch (error) {
    console.error("Current weather loading failed:", error);
    throw new Error("Could not load current weather.");
  }
}

// for monthly forcast

export async function getMonthlyWeather(
  latitude,
  longitude,
  startDate,
  endDate,
) {
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max&forecast_days=16&timezone=auto`,
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Open-Meteo forecast error:", data);

      throw new Error(data.reason || "Could not load monthly weather.");
    }

    return {
      dailyTime: data.daily?.time || [],
      dailyHigh: data.daily?.temperature_2m_max || [],
      dailyLow: data.daily?.temperature_2m_min || [],
      dailyWeatherCode: data.daily?.weather_code || [],
      dailyPrecipitation: data.daily?.precipitation_probability_max || [],
      timezone: data.timezone,
    };
  } catch (error) {
    console.error("Monthly weather loading failed:", error);

    throw new Error("Could not load monthly weather.");
  }
}

// Get historical daily weather for completed days

export async function getPastMonthlyWeather(
  latitude,
  longitude,
  startDate,
  endDate,
) {
  try {
    const response = await fetch(
      `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&start_date=${startDate}&end_date=${endDate}&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto`,
    );
    if (!response.ok) {
      throw new Error("Could not load past monthly weather.");
    }
    const data = await response.json();
    return {
      dailyTime: data.daily?.time || [],
      dailyHigh: data.daily?.temperature_2m_max || [],
      dailyLow: data.daily?.temperature_2m_min || [],
      dailyWeatherCode: data.daily?.weather_code || [],
      timezone: data.timezone,
    };
  } catch (error) {
    console.error("Past monthly weather loading failed:", error);
    throw new Error("Could not load past monthly weather.");
  }
}

async function loadMonthlyEstimateData() {
  if (monthlyLatitude === null || monthlyLongitude === null) {
    console.error("Monthly estimate failed: location is not available.");
    return;
  }

  const today = new Date();

  const currentYear = today.getFullYear();

  // Get the same month from
  // previous years.
  const startYear = currentYear - 5;

  const startDate = `${startYear}-${String(today.getMonth() + 1).padStart(
    2,
    "0",
  )}-01`;

  const endDate = `${currentYear - 1}-${String(today.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(
    new Date(currentYear, today.getMonth() + 1, 0).getDate(),
  ).padStart(2, "0")}`;

  try {
    monthlyEstimateData = await getMonthlyEstimate(
      monthlyLatitude,
      monthlyLongitude,
      startDate,
      endDate,
    );
  } catch (error) {
    console.error("Monthly estimate data loading failed:", error);

    monthlyEstimateData = null;
  }
}

// Calculate future monthly estimates
// using historical weather data

export async function getMonthlyEstimate(
  latitude,
  longitude,
  startDate,
  endDate,
) {
  try {
    const url =
      `https://archive-api.open-meteo.com/v1/archive` +
      `?latitude=${latitude}` +
      `&longitude=${longitude}` +
      `&start_date=${startDate}` +
      `&end_date=${endDate}` +
      `&daily=temperature_2m_max,temperature_2m_min,weather_code` +
      `&timezone=auto`;

    const response = await fetch(url);

    const data = await response.json();

    if (!response.ok) {
      console.error("Open-Meteo estimate error:", data);

      throw new Error(data.reason || "Could not load monthly estimate data.");
    }

    return {
      dailyTime: data.daily?.time || [],
      dailyHigh: data.daily?.temperature_2m_max || [],
      dailyLow: data.daily?.temperature_2m_min || [],
      dailyWeatherCode: data.daily?.weather_code || [],
      timezone: data.timezone,
    };
  } catch (error) {
    console.error("Monthly estimate loading failed:", error);

    throw new Error("Could not load monthly estimate data.");
  }
}

function calculateHistoricalEstimate(targetDate) {
  if (!monthlyEstimateData?.dailyTime?.length) {
    return null;
  }

  const target = new Date(targetDate);

  const targetMonth = target.getMonth();

  const targetDay = target.getDate();

  const highs = [];
  const lows = [];

  monthlyEstimateData.dailyTime.forEach((date, index) => {
    const historicalDate = new Date(date);

    if (
      historicalDate.getMonth() === targetMonth &&
      historicalDate.getDate() === targetDay
    ) {
      const high = monthlyEstimateData.dailyHigh?.[index];

      const low = monthlyEstimateData.dailyLow?.[index];

      if (high != null && low != null) {
        highs.push(high);
        lows.push(low);
      }
    }
  });

  if (!highs.length || !lows.length) {
    return null;
  }

  const averageHigh =
    highs.reduce((sum, value) => sum + value, 0) / highs.length;

  const averageLow = lows.reduce((sum, value) => sum + value, 0) / lows.length;

  return {
    high: averageHigh,
    low: averageLow,
  };
}

// Air Quality

export async function getAirQuality(latitude, longitude) {
  try {
    const response = await fetch(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=us_aqi,pm2_5,pm10,ozone,nitrogen_dioxide,sulphur_dioxide,carbon_monoxide&timezone=auto`,
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Open-Meteo air quality error:", data);

      throw new Error(data.reason || "Could not load air quality.");
    }

    return {
      aqi: data.current?.us_aqi ?? null,

      pm25: data.current?.pm2_5 ?? null,

      pm10: data.current?.pm10 ?? null,

      ozone: data.current?.ozone ?? null,

      nitrogenDioxide: data.current?.nitrogen_dioxide ?? null,

      sulphurDioxide: data.current?.sulphur_dioxide ?? null,

      carbonMonoxide: data.current?.carbon_monoxide ?? null,

      time: data.current?.time ?? null,

      timezone: data.timezone ?? null,
    };
  } catch (error) {
    console.error("Air quality loading failed:", error);

    throw new Error("Could not load air quality data.");
  }
}
