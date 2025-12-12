import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'hu' | 'ro' | 'sk' | 'hr' | 'de' | 'fr' | 'es' | 'it' | 'pl' | 'cn' | 'jp';

type LanguageName = {
    [key in Language]: string;
};

export const LANGUAGE_NAMES: LanguageName = {
    en: 'English',
    hu: 'Magyar',
    ro: 'Română',
    sk: 'Slovenčina',
    hr: 'Hrvatski',
    de: 'Deutsch',
    fr: 'Français',
    es: 'Español',
    it: 'Italiano',
    pl: 'Polski',
    cn: '中文',
    jp: '日本語',
};

interface Translations {
    [key: string]: {
        [key in Language]: string;
    };
}

const translations: Translations = {
    // ... (content omitted for brevity, full backup of previous state)
};
