const DEFAULT_SETTINGS = {
    lat: null,
    lon: null,
    theme: 'system',
    language: 'system'
};

export function getSettings() {
    const saved = localStorage.getItem('omegaSettings');
    if (saved) {
        try {
            return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
        } catch (e) {
            console.error('Failed to parse saved settings:', e);
            return DEFAULT_SETTINGS;
        }
    }
    return DEFAULT_SETTINGS;
}

export function saveSettings(settings) {
    localStorage.setItem('omegaSettings', JSON.stringify(settings));
}
