import React, { useEffect, useRef } from "react";
import { Chart, ArcElement, Tooltip, Legend } from "chart.js";

// Register the necessary components
Chart.register(ArcElement, Tooltip, Legend);

const MyChartComponent = ({ data }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    // Create chart instance
    chartInstance.current = new Chart(chartRef.current, {
      type: "doughnut", // or any other type you are using
      data: data,
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: "top",
          },
        },
      },
    });

    // Cleanup function to destroy the chart instance
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data]);

  return <canvas ref={chartRef} />;
};

export default MyChartComponent;
