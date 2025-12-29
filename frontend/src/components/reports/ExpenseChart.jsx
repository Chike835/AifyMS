import { useEffect, useRef } from 'react';

const ExpenseChart = ({ data, title = 'Expenses by Category' }) => {
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
    const labels = data.map(item => item.category?.name || item.name || item.label || 'Unknown');
    const values = data.map(item => parseFloat(item.total_amount || item.amount || item.value || 0));

    // Create color palette
    const colors = [
      'rgba(239, 68, 68, 0.8)',   // red
      'rgba(245, 158, 11, 0.8)',  // amber
      'rgba(251, 191, 36, 0.8)',  // yellow
      'rgba(34, 197, 94, 0.8)',   // green
      'rgba(59, 130, 246, 0.8)',  // blue
      'rgba(147, 51, 234, 0.8)',  // purple
      'rgba(236, 72, 153, 0.8)',  // pink
      'rgba(20, 184, 166, 0.8)',  // teal
    ];

    // Create new chart
    chartRef.current = new window.Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Expenses',
          data: values,
          backgroundColor: colors.slice(0, labels.length),
          borderColor: colors.slice(0, labels.length).map(c => c.replace('0.8', '1')),
          borderWidth: 1
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
            callbacks: {
              label: function(context) {
                return `Amount: ₦${context.parsed.y.toLocaleString()}`;
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

export default ExpenseChart;





























