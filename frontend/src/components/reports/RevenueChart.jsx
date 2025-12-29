import { useEffect, useRef } from 'react';

const RevenueChart = ({ data, title = 'Revenue Trend' }) => {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!window.Chart || !data || !canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');

    // Destroy existing chart if it exists
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    // Prepare chart data
    const labels = data.map(item => {
      const date = new Date(item.date || item.day || item.label);
      return date.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });
    });
    const values = data.map(item => parseFloat(item.amount || item.revenue || item.value || 0));

    // Create new chart
    chartRef.current = new window.Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Revenue',
          data: values,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: title,
            font: {
              size: 16,
              weight: 'bold'
            }
          },
          legend: {
            display: false
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              label: function(context) {
                return `Revenue: ₦${context.parsed.y.toLocaleString()}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return '₦' + value.toLocaleString();
              }
            }
          }
        }
      }
    });

    // Cleanup on unmount
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [data, title]);

  return (
    <div className="bg-white rounded-lg shadow p-4 h-80">
      <canvas ref={canvasRef}></canvas>
    </div>
  );
};

export default RevenueChart;





























