const dictionary = {
    en: {
        appTitle: 'Omega Sunlight',
        settingsTitle: 'Settings',
        latitude: 'Latitude',
        longitude: 'Longitude',
        theme: 'Theme',
        themeSystem: 'System',
        themeLight: 'Light',
        themeDark: 'Dark',
        language: 'Language',
        langSystem: 'System',
        cancel: 'Cancel',
        save: 'Save',
        loading: 'Loading data...',
        chartTitle: 'Shortwave Radiation (W/m²)'
    },
    ja: {
        appTitle: 'Omega Sunlight',
        settingsTitle: '設定',
        latitude: '緯度',
        longitude: '経度',
        theme: 'テーマ',
        themeSystem: 'システム依存',
        themeLight: 'ライトモード',
        themeDark: 'ダークモード',
        language: '言語',
        langSystem: 'システム依存',
        cancel: 'キャンセル',
        save: '保存',
        loading: 'データを読み込み中...',
        chartTitle: '短波放射量 (W/m²)'
    }
};

export function getLanguage(settingLang) {
    if (settingLang === 'system') {
        const browserLang = navigator.language.slice(0, 2);
        return dictionary[browserLang] ? browserLang : 'en';
    }
    return dictionary[settingLang] ? settingLang : 'en';
}

export function applyTranslations(lang) {
    const dict = dictionary[lang];
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[key]) {
            el.textContent = dict[key];
        }
    });
}

export function getTranslation(lang, key) {
    return dictionary[lang]?.[key] || dictionary['en'][key] || key;
}
