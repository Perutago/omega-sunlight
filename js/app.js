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
    applyTheme(currentSettings.theme);
    const lang = getLanguage(currentSettings.language);
    document.documentElement.lang = lang;
    applyTranslations(lang);
    
    // Select defaults for selects
    document.getElementById('theme').value = currentSettings.theme;
    document.getElementById('language').value = currentSettings.language;
    document.getElementById('lat').value = currentSettings.lat;
    document.getElementById('lon').value = currentSettings.lon;

    loadChartData();
}

function setupEventListeners() {
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    const settingsForm = document.getElementById('settingsForm');

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
        document.getElementById('lat').value = currentSettings.lat;
        document.getElementById('lon').value = currentSettings.lon;
        document.getElementById('theme').value = currentSettings.theme;
        document.getElementById('language').value = currentSettings.language;
        settingsModal.classList.remove('hidden');
    });

    closeSettingsBtn.addEventListener('click', () => {
        settingsModal.classList.add('hidden');
    });

    settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const newSettings = {
            lat: parseFloat(document.getElementById('lat').value),
            lon: parseFloat(document.getElementById('lon').value),
            theme: document.getElementById('theme').value,
            language: document.getElementById('language').value
        };

        const changedLocation = newSettings.lat !== currentSettings.lat || newSettings.lon !== currentSettings.lon;
        const changedLanguage = newSettings.language !== currentSettings.language;
        const changedTheme = newSettings.theme !== currentSettings.theme;
        
        currentSettings = newSettings;
        saveSettings(currentSettings);
        
        if (changedTheme) {
            applyTheme(currentSettings.theme);
        }
        
        if (changedLanguage) {
            const lang = getLanguage(currentSettings.language);
            document.documentElement.lang = lang;
            applyTranslations(lang);
        }

        if (changedLocation || changedLanguage || changedTheme) {
            loadChartData();
        }

        settingsModal.classList.add('hidden');
    });

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (currentSettings.theme === 'system') {
            applyTheme('system');
            loadChartData(); // Re-render chart for color changes
        }
    });
}

function applyTheme(theme) {
    if (theme === 'system') {
        document.documentElement.removeAttribute('data-theme');
    } else {
        document.documentElement.setAttribute('data-theme', theme);
    }
}

async function loadChartData() {
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const chartCanvas = document.getElementById('sunlightChart');
    
    loading.classList.remove('hidden');
    error.classList.add('hidden');
    
    // We just hide it visually to keep dimensions if needed, or don't touch
    // The chart.js instance will just redraw over.

    try {
        const data = await fetchSunlightData(currentSettings.lat, currentSettings.lon);
        const { labels, values, weatherIcons, date } = processDataForDaytime(data);
        
        const lang = getLanguage(currentSettings.language);
        const title = `${getTranslation(lang, 'chartTitle')} - ${date}`;
        
        renderChart('sunlightChart', labels, values, weatherIcons, title, currentSettings.theme);
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
