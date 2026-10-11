const DEFAULT_SETTINGS = {
    lat: null,
    lon: null,
    theme: 'system',
    appearance: 'standard',
    language: 'system'
};

const VALID_THEMES = ['system', 'light', 'dark'];
const VALID_APPEARANCES = ['standard', 'cool', 'pop'];

export function getSettings() {
    const saved = localStorage.getItem('omegaSettings');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            const settings = { ...DEFAULT_SETTINGS, ...parsed };
            if (!VALID_THEMES.includes(settings.theme)) {
                settings.theme = DEFAULT_SETTINGS.theme;
            }
            if (!VALID_APPEARANCES.includes(settings.appearance)) {
                settings.appearance = DEFAULT_SETTINGS.appearance;
            }
            return settings;
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
