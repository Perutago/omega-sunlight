let chartInstance = null;

export function clearChart() {
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }
}

export function renderChart(canvasId, labels, values, weatherIcons, title, theme) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    
    if (chartInstance) {
        chartInstance.destroy();
    }
    
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const textColor = isDark ? '#f8fafc' : '#0f172a';
    const gridColor = isDark ? '#334155' : '#e2e8f0';

    const weatherPlugin = {
        id: 'weatherPlugin',
        afterDraw(chart) {
            const { ctx, scales: { x }, chartArea: { bottom } } = chart;
            if (!weatherIcons) return;

            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.font = '24px Arial'; // Larger font size for weather icons

            x.ticks.forEach((tick, index) => {
                const xPos = x.getPixelForTick(index);
                const icon = weatherIcons[index];
                if (icon) {
                    ctx.fillText(icon, xPos, bottom + 25);
                }
            });
            ctx.restore();
        }
    };

    chartInstance = new Chart(ctx, {
        plugins: [weatherPlugin],
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: title,
                data: values,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#3b82f6',
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    bottom: 35
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: textColor
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: textColor
                    },
                    grid: {
                        color: gridColor
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: textColor
                    },
                    grid: {
                        color: gridColor
                    }
                }
            }
        }
    });
}
