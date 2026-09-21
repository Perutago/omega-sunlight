const DEFAULT_SETTINGS = {
    lat: 35.6895, // Tokyo default
    lon: 139.6917,
    theme: 'system',
    language: 'system'
};

export function getSettings() {
    const saved = localStorage.getItem('omegaSettings');
    if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
    return DEFAULT_SETTINGS;
}

export function saveSettings(settings) {
    localStorage.setItem('omegaSettings', JSON.stringify(settings));
}
