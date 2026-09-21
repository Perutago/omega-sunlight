export async function fetchSunlightData(lat, lon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=shortwave_radiation&daily=sunrise,sunset&timezone=auto&past_days=1&forecast_days=3`;
    
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error('Failed to fetch data from Open-Meteo API');
    }
    
    return await response.json();
}

export function processDataForDaytime(data) {
    const now = new Date();
    
    const sunrises = data.daily.sunrise.map(ts => new Date(ts));
    const sunsets = data.daily.sunset.map(ts => new Date(ts));
    
    let targetSunrise, targetSunset;
    
    for (let i = 0; i < sunrises.length; i++) {
        if (now <= sunsets[i]) {
            targetSunrise = sunrises[i];
            targetSunset = sunsets[i];
            break;
        }
    }
    
    if (!targetSunrise) {
        targetSunrise = sunrises[sunrises.length - 1];
        targetSunset = sunsets[sunsets.length - 1];
    }
    
    const startHour = new Date(targetSunrise);
    startHour.setMinutes(0, 0, 0);
    
    const endHour = new Date(targetSunset);
    endHour.setHours(endHour.getHours() + 1);
    endHour.setMinutes(0, 0, 0);
    
    const labels = [];
    const values = [];
    
    data.hourly.time.forEach((timeStr, index) => {
        const time = new Date(timeStr);
        if (time >= startHour && time <= endHour) {
            labels.push(time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
            values.push(data.hourly.shortwave_radiation[index]);
        }
    });
    
    return { labels, values, date: targetSunrise.toLocaleDateString() };
}
