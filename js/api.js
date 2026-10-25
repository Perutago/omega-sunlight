export async function fetchSunlightData(lat, lon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=shortwave_radiation,weather_code&daily=sunrise,sunset&timezone=auto&past_days=1&forecast_days=3`;
    
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error('Failed to fetch data from Open-Meteo API');
    }
    
    return await response.json();
}

export function processDataForDaytime(data, dayOffset = 0) {
    const tz = data.timezone || 'UTC';
    const nowStr = new Date().toLocaleString('en-US', { timeZone: tz, hour12: false });
    const now = new Date(nowStr);

    const sunrises = data.daily.sunrise.map(ts => new Date(ts));
    const sunsets = data.daily.sunset.map(ts => new Date(ts));

    // offset=0 の基準インデックスを求める（現在時刻が日没を過ぎていたら翌日が起点）
    let baseIndex = sunrises.length - 1;
    for (let i = 0; i < sunsets.length; i++) {
        if (now <= sunsets[i]) {
            baseIndex = i;
            break;
        }
    }

    const targetIndex = Math.min(baseIndex + dayOffset, sunrises.length - 1);
    const targetSunrise = sunrises[targetIndex];
    const targetSunset  = sunsets[targetIndex];

    const startHour = new Date(targetSunrise);
    startHour.setMinutes(0, 0, 0);

    const endHour = new Date(targetSunset);
    endHour.setHours(endHour.getHours() + 1);
    endHour.setMinutes(0, 0, 0);

    const labels = [];
    const weatherIcons = [];
    const values = [];

    data.hourly.time.forEach((timeStr, index) => {
        const time = new Date(timeStr);
        if (time >= startHour && time <= endHour) {
            const timeLabel = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const weatherCode = data.hourly.weather_code ? data.hourly.weather_code[index] : null;
            const icon = getWeatherIcon(weatherCode);

            labels.push(timeLabel);
            weatherIcons.push(icon);
            values.push(data.hourly.shortwave_radiation[index]);
        }
    });

    return { labels, values, weatherIcons, date: targetSunrise };
}

/**
 * 2日分の日付オブジェクトを返す（タブラベル用）
 * @param {object} data - Open-Meteo APIレスポンス
 * @returns {{ date0: Date, date1: Date }}
 */
export function getTwoDayDates(data) {
    const tz = data.timezone || 'UTC';
    const nowStr = new Date().toLocaleString('en-US', { timeZone: tz, hour12: false });
    const now = new Date(nowStr);

    const sunrises = data.daily.sunrise.map(ts => new Date(ts));
    const sunsets  = data.daily.sunset.map(ts => new Date(ts));

    let baseIndex = sunrises.length - 1;
    for (let i = 0; i < sunsets.length; i++) {
        if (now <= sunsets[i]) {
            baseIndex = i;
            break;
        }
    }

    return {
        date0: sunrises[Math.min(baseIndex,     sunrises.length - 1)],
        date1: sunrises[Math.min(baseIndex + 1, sunrises.length - 1)],
    };
}

/**
 * 2日分の昼間データにおける日射量（shortwave_radiation）の最大値を返す
 * @param {object} data - Open-Meteo APIレスポンス
 * @returns {number|null}
 */
export function getTwoDayMaxRadiation(data) {
    if (!data) return null;
    const day0 = processDataForDaytime(data, 0);
    const day1 = processDataForDaytime(data, 1);
    const values0 = (day0.values || []).filter(v => typeof v === 'number' && !isNaN(v));
    const values1 = (day1.values || []).filter(v => typeof v === 'number' && !isNaN(v));
    const allValues = [...values0, ...values1];
    if (allValues.length === 0) return null;
    const max = Math.max(...allValues);
    return max > 0 ? max : null;
}

function getWeatherIcon(code) {
    if (code === undefined || code === null) return '';
    if (code === 0) return '☀️'; // Clear sky
    if (code === 1 || code === 2) return '🌤️'; // Partly cloudy
    if (code === 3) return '☁️'; // Overcast
    if (code === 45 || code === 48) return '🌫️'; // Fog
    if (code >= 51 && code <= 67) return '🌧️'; // Drizzle / Rain
    if (code >= 71 && code <= 77) return '❄️'; // Snow
    if (code >= 80 && code <= 82) return '🌦️'; // Rain showers
    if (code === 85 || code === 86) return '🌨️'; // Snow showers
    if (code >= 95 && code <= 99) return '⛈️'; // Thunderstorm
    return '';
}
