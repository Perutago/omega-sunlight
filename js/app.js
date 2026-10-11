import { getSettings, saveSettings } from './storage.js';
import { getLanguage, applyTranslations, getTranslation } from './i18n.js';
import { fetchSunlightData, processDataForDaytime } from './api.js';
import { renderChart, clearChart } from './chart.js';

let currentSettings = getSettings();

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
    document.getElementById('settingsModal').classList.remove('hidden');
}

function setupEventListeners() {
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
        }

        if (changedLocation || changedLanguage || changedTheme || changedAppearance) {
            loadChartData();
        }

        settingsModal.classList.add('hidden');
    });

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (currentSettings.theme === 'system') {
            applyTheme('system', currentSettings.appearance);
            loadChartData(); // Re-render chart for color changes
        }
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
        if (locationNotice) locationNotice.classList.remove('hidden');
        return;
    }

    if (locationNotice) locationNotice.classList.add('hidden');
    if (chartContainer) chartContainer.classList.remove('hidden');
    loading.classList.remove('hidden');
    error.classList.add('hidden');

    try {
        const data = await fetchSunlightData(currentSettings.lat, currentSettings.lon);
        const { labels, values, weatherIcons, date } = processDataForDaytime(data);
        
        const lang = getLanguage(currentSettings.language);
        const title = `${getTranslation(lang, 'chartTitle')} - ${date}`;
        
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
