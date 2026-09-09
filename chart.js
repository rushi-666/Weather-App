let tempChart;

try {
  document.addEventListener("DOMContentLoaded", function () {
    try {
      const canvas = document.getElementById("tempChart");

      if (!canvas) {
        console.error("Temperature chart canvas not found.");
        return;
      }

      const ctx = canvas.getContext("2d");

      if (!ctx) {
        console.error("Could not get temperature chart context.");
        return;
      }

      // Create a linear gradient for the filled area under the line

      const gradient = ctx.createLinearGradient(0, 0, 0, 200);

      gradient.addColorStop(0, "rgba(0, 0, 0, 0.4)");

      gradient.addColorStop(1, "rgba(0, 0, 0, 0.0)");

      // Create Temperature Chart

      try {
        tempChart = new Chart(ctx, {
          type: "line",

          data: {
            // X-Axis Labels matching your Figma screen

            labels: [],

            datasets: [
              {
                // Y-Axis Data matching the curve peak at 3PM

                data: [],

                // Styling the line and fill

                borderColor: "#7ec0ee",

                borderWidth: 2,

                tension: 0.4,

                fill: true,

                backgroundColor: gradient,

                // Styling the data point dots

                pointBackgroundColor: "#7ec0ee",

                pointBorderColor: "#fff",

                pointBorderWidth: 1.5,

                pointRadius: 4,

                pointHoverRadius: 6,
              },
            ],
          },

          options: {
            responsive: true,

            maintainAspectRatio: false,

            plugins: {
              legend: {
                display: false,
              },

              tooltip: {
                enabled: true,

                callbacks: {
                  label: function (context) {
                    try {
                      const unit =
                        localStorage.getItem("temperatureUnit") || "C";

                      return `${context.parsed.y}°${unit}`;
                    } catch (error) {
                      console.error("Temperature tooltip error:", error);

                      return `${context.parsed.y}°C`;
                    }
                  },
                },
              },
            },

            scales: {
              // Hide the grid lines and axes

              x: {
                grid: {
                  display: false,
                },

                ticks: {
                  color: "rgba(255, 255, 255, 0.5)",

                  font: {
                    size: 11,
                  },

                  autoSkip: true,

                  maxTicksLimit: 8,
                },
              },

              y: {
                display: false,

                grid: {
                  display: false,
                },
              },
            },
          },
        });
      } catch (error) {
        console.error("Temperature chart creation failed:", error);
      }
    } catch (error) {
      console.error("Temperature chart initialization failed:", error);
    }
  });
} catch (error) {
  console.error("DOMContentLoaded event setup failed:", error);
}

// Update Temperature Chart

export function updateChart(labels, temperatures) {
  try {
    // Check whether chart exists

    if (!tempChart) {
      console.error("Temperature chart is not initialized.");

      return;
    }

    // Check input data

    if (!Array.isArray(labels) || !Array.isArray(temperatures)) {
      console.error("Invalid temperature chart data.");

      return;
    }

    // Get today's labels

    const todayLabels = labels.slice(0, 24);

    // Format labels

    const formattedLabels = todayLabels.map((time) => {
      try {
        return new Date(time).toLocaleTimeString("en-US", {
          hour: "numeric",
          hour12: true,
        });
      } catch (error) {
        console.error("Chart time formatting failed:", error);

        return "";
      }
    });

    // Get today's temperatures

    const todayTemperatures = temperatures.slice(0, 24);

    // Update chart data

    tempChart.data.labels = formattedLabels;

    tempChart.data.datasets[0].data = todayTemperatures;

    // Update chart

    tempChart.update();
  } catch (error) {
    console.error("Temperature chart update failed:", error);
  }
}
