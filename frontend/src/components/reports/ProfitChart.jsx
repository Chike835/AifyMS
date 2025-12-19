import { useEffect, useRef } from 'react';

const ProfitChart = ({ data, title = 'Profit Distribution' }) => {
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
    // Data should be an object with profit breakdown or array of {label, value}
    let labels, values;
    
    if (Array.isArray(data)) {
      labels = data.map(item => item.label || item.name || 'Unknown');
      values = data.map(item => parseFloat(item.value || item.amount || 0));
    } else if (typeof data === 'object') {
      // Assume it's a profit breakdown object
      labels = Object.keys(data).filter(key => typeof data[key] === 'number');
      values = labels.map(key => Math.abs(data[key]));
    } else {
      return;
    }

    // Create color palette
    const colors = [
      'rgba(34, 197, 94, 0.8)',   // green (profit)
      'rgba(239, 68, 68, 0.8)',   // red (loss)
      'rgba(59, 130, 246, 0.8)',  // blue
      'rgba(245, 158, 11, 0.8)',  // amber
      'rgba(147, 51, 234, 0.8)',  // purple
      'rgba(236, 72, 153, 0.8)',  // pink
    ];

    // Create new chart
    chartRef.current = new window.Chart(ctx, {
      type: 'pie',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: colors.slice(0, labels.length),
          borderColor: '#ffffff',
          borderWidth: 2
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
            position: 'right',
            labels: {
              padding: 15,
              usePointStyle: true
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.parsed || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return `${label}: ₦${value.toLocaleString()} (${percentage}%)`;
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

export default ProfitChart;


























