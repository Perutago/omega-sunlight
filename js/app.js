import { getSettings, saveSettings } from './storage.js';
import { getLanguage, applyTranslations, getTranslation } from './i18n.js';
import { fetchSunlightData, processDataForDaytime, getTwoDayDates } from './api.js';
import { renderChart, clearChart } from './chart.js';

let currentSettings = getSettings();
let selectedDayOffset = 0; // 0=直近の日, 1=翌日
let cachedApiData = null;  // APIデータをキャッシュしてタブ切り替え時の再リクエストを省く


document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupEventListeners();
    
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(err => {
            console.error('Service Worker registration failed:', err);
        });
    }
});

function initApp() {
    applyTheme(currentSettings.theme, currentSettings.appearance);
    const lang = getLanguage(currentSettings.language);
    document.documentElement.lang = lang;
    applyTranslations(lang);
    applyPlaceholderTranslations(lang);
    
    // Select defaults for selects
    document.getElementById('theme').value = currentSettings.theme;
    if (document.getElementById('appearance')) {
        document.getElementById('appearance').value = currentSettings.appearance;
    }
    document.getElementById('language').value = currentSettings.language;
    document.getElementById('lat').value = currentSettings.lat ?? '';
    document.getElementById('lon').value = currentSettings.lon ?? '';

    loadChartData();
}

function openSettingsModal() {
    document.getElementById('lat').value = currentSettings.lat ?? '';
    document.getElementById('lon').value = currentSettings.lon ?? '';
    document.getElementById('theme').value = currentSettings.theme;
    if (document.getElementById('appearance')) {
        document.getElementById('appearance').value = currentSettings.appearance;
    }
    document.getElementById('language').value = currentSettings.language;
    // Reset location search UI
    const locationSearch = document.getElementById('locationSearch');
    if (locationSearch) locationSearch.value = '';
    hideLocationResults();
    document.getElementById('settingsModal').classList.remove('hidden');
}

function setupEventListeners() {
    setupDayTabs();
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    const settingsForm = document.getElementById('settingsForm');
    const openSettingsNoticeBtn = document.getElementById('openSettingsNoticeBtn');

    const infoBtn = document.getElementById('infoBtn');
    const infoModal = document.getElementById('infoModal');
    const closeInfoBtn = document.getElementById('closeInfoBtn');

    infoBtn.addEventListener('click', () => {
        infoModal.classList.remove('hidden');
    });

    closeInfoBtn.addEventListener('click', () => {
        infoModal.classList.add('hidden');
    });

    settingsBtn.addEventListener('click', () => {
        openSettingsModal();
    });

    if (openSettingsNoticeBtn) {
        openSettingsNoticeBtn.addEventListener('click', () => {
            openSettingsModal();
        });
    }

    closeSettingsBtn.addEventListener('click', () => {
        settingsModal.classList.add('hidden');
    });

    settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const latVal = document.getElementById('lat').value.trim();
        const lonVal = document.getElementById('lon').value.trim();
        const appearanceEl = document.getElementById('appearance');

        const newSettings = {
            lat: latVal !== '' ? parseFloat(latVal) : null,
            lon: lonVal !== '' ? parseFloat(lonVal) : null,
            theme: document.getElementById('theme').value,
            appearance: appearanceEl ? appearanceEl.value : 'standard',
            language: document.getElementById('language').value
        };

        const changedLocation = newSettings.lat !== currentSettings.lat || newSettings.lon !== currentSettings.lon;
        const changedLanguage = newSettings.language !== currentSettings.language;
        const changedTheme = newSettings.theme !== currentSettings.theme;
        const changedAppearance = newSettings.appearance !== currentSettings.appearance;
        
        currentSettings = newSettings;
        saveSettings(currentSettings);
        
        if (changedTheme || changedAppearance) {
            applyTheme(currentSettings.theme, currentSettings.appearance);
        }
        
        if (changedLanguage) {
            const lang = getLanguage(currentSettings.language);
            document.documentElement.lang = lang;
            applyTranslations(lang);
            applyPlaceholderTranslations(lang);
        }

        if (changedLocation || changedLanguage || changedTheme || changedAppearance) {
            loadChartData();
        }

        settingsModal.classList.add('hidden');
    });

    // --- Location search ---
    const searchLocationBtn = document.getElementById('searchLocationBtn');
    const locationSearchInput = document.getElementById('locationSearch');
    const useCurrentLocationBtn = document.getElementById('useCurrentLocationBtn');

    if (searchLocationBtn && locationSearchInput) {
        searchLocationBtn.addEventListener('click', () => {
            searchLocation(locationSearchInput.value.trim());
        });

        locationSearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchLocation(locationSearchInput.value.trim());
            }
        });

        // Close results when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#locationSearch') && !e.target.closest('#locationResults') && !e.target.closest('#searchLocationBtn')) {
                hideLocationResults();
            }
        });
    }

    if (useCurrentLocationBtn) {
        useCurrentLocationBtn.addEventListener('click', () => {
            useCurrentLocation();
        });
    }

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (currentSettings.theme === 'system') {
            applyTheme('system', currentSettings.appearance);
            loadChartData(); // Re-render chart for color changes
        }
    });
}

function hideLocationResults() {
    const results = document.getElementById('locationResults');
    if (results) results.classList.add('hidden');
}

function setupDayTabs() {
    const tab0 = document.getElementById('tab0');
    const tab1 = document.getElementById('tab1');
    if (!tab0 || !tab1) return;

    tab0.addEventListener('click', () => {
        if (selectedDayOffset === 0) return;
        selectedDayOffset = 0;
        updateTabActiveState();
        renderSelectedDay();
    });

    tab1.addEventListener('click', () => {
        if (selectedDayOffset === 1) return;
        selectedDayOffset = 1;
        updateTabActiveState();
        renderSelectedDay();
    });
}

function updateTabActiveState() {
    const tab0 = document.getElementById('tab0');
    const tab1 = document.getElementById('tab1');
    if (!tab0 || !tab1) return;
    tab0.classList.toggle('active', selectedDayOffset === 0);
    tab1.classList.toggle('active', selectedDayOffset === 1);
}

function updateTabLabels(data) {
    const tab0 = document.getElementById('tab0');
    const tab1 = document.getElementById('tab1');
    if (!tab0 || !tab1 || !data) return;

    const lang = getLanguage(currentSettings.language);
    const { date0, date1 } = getTwoDayDates(data);
    const fmt = { month: 'numeric', day: 'numeric', weekday: 'short' };
    tab0.textContent = date0.toLocaleDateString(lang, fmt);
    tab1.textContent = date1.toLocaleDateString(lang, fmt);
}

async function renderSelectedDay() {
    if (!cachedApiData) return;
    const chartCanvas = document.getElementById('sunlightChart');
    const chartContainer = document.querySelector('.chart-container');

    // フェードアウト
    if (chartContainer) chartContainer.classList.add('chart-fade');

    await new Promise(r => setTimeout(r, 150));

    const { labels, values, weatherIcons, date } = processDataForDaytime(cachedApiData, selectedDayOffset);
    const lang = getLanguage(currentSettings.language);
    const fmt = { year: 'numeric', month: 'numeric', day: 'numeric' };
    const title = `${getTranslation(lang, 'chartTitle')} - ${date.toLocaleDateString(lang, fmt)}`;

    renderChart('sunlightChart', labels, values, weatherIcons, title, currentSettings.theme, currentSettings.appearance);

    // フェードイン
    if (chartContainer) chartContainer.classList.remove('chart-fade');
}


async function searchLocation(query) {
    if (!query) return;
    const lang = getLanguage(currentSettings.language);
    const resultsEl = document.getElementById('locationResults');
    const searchBtn = document.getElementById('searchLocationBtn');
    if (!resultsEl) return;

    searchBtn.textContent = getTranslation(lang, 'searching');
    searchBtn.disabled = true;
    resultsEl.innerHTML = '';
    resultsEl.classList.add('hidden');

    try {
        // Use Open-Meteo Geocoding API (no API key required)
        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=8&language=${lang}&format=json`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network error');
        const data = await response.json();

        resultsEl.classList.remove('hidden');

        if (!data.results || data.results.length === 0) {
            const li = document.createElement('li');
            li.className = 'no-results';
            li.textContent = getTranslation(lang, 'noResults');
            resultsEl.appendChild(li);
        } else {
            data.results.forEach(place => {
                const li = document.createElement('li');
                const parts = [place.name];
                if (place.admin1) parts.push(place.admin1);
                if (place.country) parts.push(place.country);
                li.textContent = parts.join(', ');
                li.tabIndex = 0;
                li.addEventListener('click', () => selectLocation(place.latitude, place.longitude));
                li.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        selectLocation(place.latitude, place.longitude);
                    }
                });
                resultsEl.appendChild(li);
            });
        }
    } catch (err) {
        resultsEl.classList.remove('hidden');
        const li = document.createElement('li');
        li.className = 'no-results';
        li.textContent = getTranslation(lang, 'searchError');
        resultsEl.appendChild(li);
    } finally {
        const lang2 = getLanguage(currentSettings.language);
        searchBtn.textContent = getTranslation(lang2, 'searchBtn');
        searchBtn.disabled = false;
    }
}

function selectLocation(lat, lon) {
    document.getElementById('lat').value = parseFloat(lat.toFixed(4));
    document.getElementById('lon').value = parseFloat(lon.toFixed(4));
    hideLocationResults();
    const locationSearch = document.getElementById('locationSearch');
    if (locationSearch) locationSearch.value = '';
}

function useCurrentLocation() {
    const lang = getLanguage(currentSettings.language);
    const btn = document.getElementById('useCurrentLocationBtn');
    const span = btn ? btn.querySelector('span') : null;
    if (!navigator.geolocation) {
        if (span) span.textContent = getTranslation(lang, 'locationError');
        return;
    }
    if (btn) btn.disabled = true;
    if (span) span.textContent = getTranslation(lang, 'gettingLocation');

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            selectLocation(pos.coords.latitude, pos.coords.longitude);
            if (btn) btn.disabled = false;
            if (span) span.textContent = getTranslation(lang, 'useCurrentLocation');
        },
        (err) => {
            if (btn) btn.disabled = false;
            const key = err.code === 1 ? 'locationDenied' : 'locationError';
            if (span) span.textContent = getTranslation(lang, key);
            setTimeout(() => {
                if (span) span.textContent = getTranslation(lang, 'useCurrentLocation');
            }, 3000);
        },
        { timeout: 10000 }
    );
}

function applyPlaceholderTranslations(lang) {
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        const val = getTranslation(lang, key);
        if (val) el.placeholder = val;
    });
}

function applyTheme(theme, appearance = 'standard') {
    if (theme === 'system') {
        document.documentElement.removeAttribute('data-theme');
    } else {
        document.documentElement.setAttribute('data-theme', theme);
    }
    document.documentElement.setAttribute('data-appearance', appearance);

    // Update meta theme-color for browser tab / mobile UI
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    let themeColor = '#f8fafc';
    if (appearance === 'cool') {
        themeColor = isDark ? '#060913' : '#eef2f6';
    } else if (appearance === 'pop') {
        themeColor = isDark ? '#1f161b' : '#fff8f0';
    } else {
        themeColor = isDark ? '#0f172a' : '#f8fafc';
    }
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
        metaThemeColor.setAttribute('content', themeColor);
    }
}

async function loadChartData() {
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const chartCanvas = document.getElementById('sunlightChart');
    const chartContainer = document.querySelector('.chart-container');
    const locationNotice = document.getElementById('locationNotice');
    const dayTabs = document.getElementById('dayTabs');

    // 緯度または経度が設定されていない場合の判定
    const isLocationConfigured = currentSettings.lat !== null &&
                                 currentSettings.lon !== null &&
                                 !isNaN(currentSettings.lat) &&
                                 !isNaN(currentSettings.lon);

    if (!isLocationConfigured) {
        if (loading) loading.classList.add('hidden');
        if (error) error.classList.add('hidden');
        clearChart();
        if (chartCanvas) {
            const ctx = chartCanvas.getContext('2d');
            ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
        }
        if (chartContainer) chartContainer.classList.add('hidden');
        if (dayTabs) dayTabs.classList.add('hidden');
        if (locationNotice) locationNotice.classList.remove('hidden');
        return;
    }

    if (locationNotice) locationNotice.classList.add('hidden');
    if (chartContainer) chartContainer.classList.remove('hidden');
    loading.classList.remove('hidden');
    error.classList.add('hidden');

    try {
        cachedApiData = await fetchSunlightData(currentSettings.lat, currentSettings.lon);

        // タブラベルをセット・表示
        updateTabLabels(cachedApiData);
        if (dayTabs) dayTabs.classList.remove('hidden');

        // 現在選択中の日のグラフを描画
        const { labels, values, weatherIcons, date } = processDataForDaytime(cachedApiData, selectedDayOffset);
        const lang = getLanguage(currentSettings.language);
        const fmt = { year: 'numeric', month: 'numeric', day: 'numeric' };
        const title = `${getTranslation(lang, 'chartTitle')} - ${date.toLocaleDateString(lang, fmt)}`;

        renderChart('sunlightChart', labels, values, weatherIcons, title, currentSettings.theme, currentSettings.appearance);
    } catch (err) {
        console.error(err);
        error.textContent = err.message || 'Failed to load data';
        error.classList.remove('hidden');
        clearChart();
        if (chartCanvas) {
             const ctx = chartCanvas.getContext('2d');
             ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
        }
    } finally {
        loading.classList.add('hidden');
    }
}
