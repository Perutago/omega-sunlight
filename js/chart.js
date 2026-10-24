let chartInstance = null;

export function clearChart() {
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }
}

export function renderChart(canvasId, labels, values, weatherIcons, title, theme, appearance = 'standard') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    if (chartInstance) {
        chartInstance.destroy();
    }
    
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    let borderColor = '#2563eb';
    let gradientStart = 'rgba(37, 99, 235, 0.25)';
    let gradientEnd = 'rgba(37, 99, 235, 0.01)';
    let textColor = isDark ? '#f8fafc' : '#0f172a';
    let gridColor = isDark ? '#334155' : '#e2e8f0';
    let fontFamily = "'Inter', sans-serif";
    let tension = 0.4;
    let borderWidth = 2;
    let pointRadius = 3;
    let pointHoverRadius = 5;

    if (appearance === 'cool') {
        fontFamily = "'Share Tech Mono', monospace";
        tension = 0.2;
        borderWidth = 2;
        pointRadius = 3;
        pointHoverRadius = 6;
        if (isDark) {
            borderColor = '#00f0ff';
            gradientStart = 'rgba(0, 240, 255, 0.35)';
            gradientEnd = 'rgba(0, 240, 255, 0.02)';
            textColor = '#00f0ff';
            gridColor = 'rgba(0, 240, 255, 0.15)';
        } else {
            borderColor = '#0891b2';
            gradientStart = 'rgba(8, 145, 178, 0.25)';
            gradientEnd = 'rgba(8, 145, 178, 0.02)';
            textColor = '#0e7490';
            gridColor = 'rgba(8, 145, 178, 0.18)';
        }
    } else if (appearance === 'pop') {
        fontFamily = "'M PLUS Rounded 1c', sans-serif";
        tension = 0.45;
        borderWidth = 3;
        pointRadius = 4;
        pointHoverRadius = 7;
        if (isDark) {
            borderColor = '#ff758f';
            gradientStart = 'rgba(255, 117, 143, 0.35)';
            gradientEnd = 'rgba(255, 117, 143, 0.02)';
            textColor = '#fff1f2';
            gridColor = 'rgba(255, 133, 162, 0.2)';
        } else {
            borderColor = '#ff6584';
            gradientStart = 'rgba(255, 101, 132, 0.3)';
            gradientEnd = 'rgba(254, 202, 87, 0.04)';
            textColor = '#5c3d46';
            gridColor = 'rgba(255, 182, 193, 0.35)';
        }
    } else {
        // standard
        fontFamily = "'Inter', sans-serif";
        tension = 0.4;
        borderWidth = 2;
        if (isDark) {
            borderColor = '#3b82f6';
            gradientStart = 'rgba(59, 130, 246, 0.3)';
            gradientEnd = 'rgba(59, 130, 246, 0.02)';
            textColor = '#f8fafc';
            gridColor = '#334155';
        } else {
            borderColor = '#2563eb';
            gradientStart = 'rgba(37, 99, 235, 0.25)';
            gradientEnd = 'rgba(37, 99, 235, 0.01)';
            textColor = '#0f172a';
            gridColor = '#e2e8f0';
        }
    }

    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, gradientStart);
    gradient.addColorStop(1, gradientEnd);

    const weatherPlugin = {
        id: 'weatherPlugin',
        afterDraw(chart) {
            const { ctx, scales: { x }, chartArea: { bottom } } = chart;
            if (!weatherIcons) return;

            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.font = '24px Arial, sans-serif';

            const yPos = (x && typeof x.bottom === 'number') ? x.bottom + 8 : bottom + 35;

            x.ticks.forEach((tick, index) => {
                const xPos = x.getPixelForTick(index);
                const icon = weatherIcons[index];
                if (icon) {
                    ctx.fillText(icon, xPos, yPos);
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
                borderColor: borderColor,
                backgroundColor: gradient,
                borderWidth: borderWidth,
                fill: true,
                tension: tension,
                pointBackgroundColor: borderColor,
                pointBorderColor: isDark ? '#000000' : '#ffffff',
                pointRadius: pointRadius,
                pointHoverRadius: pointHoverRadius,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    bottom: 40
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: textColor,
                        font: {
                            family: fontFamily,
                            size: 13,
                            weight: '600'
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: textColor,
                        font: {
                            family: fontFamily,
                            size: 12
                        }
                    },
                    grid: {
                        color: gridColor
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: textColor,
                        font: {
                            family: fontFamily,
                            size: 12
                        }
                    },
                    grid: {
                        color: gridColor
                    }
                }
            }
        }
    });
}
