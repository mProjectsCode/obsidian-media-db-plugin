import { expect, test } from 'bun:test';
import type { ApiLanguageSettings } from 'packages/obsidian/src/utils/ApiLanguages';
import {
	INHERIT_LANGUAGE,
	STEAM_LANGUAGES,
	VNDB_LANGUAGES,
	WIKIPEDIA_LANGUAGES,
	isSafeWikiLanguage,
	mapToOpenLibraryLanguage,
	mapToSteamLanguage,
	mapToTmdbLanguage,
	mapToVndbLanguage,
	mapToWikipediaLanguage,
	parseLanguageInput,
	pickMalTitle,
	pickVndbTitle,
	resolveMalTitlePreference,
	resolveOpenLibraryLanguage,
	resolveSteamLanguage,
	resolveTmdbLanguage,
	resolveVndbLanguage,
	resolveWikipediaLanguage,
	withOpenLibraryLanguageFilter,
} from 'packages/obsidian/src/utils/ApiLanguages';

function settings(overrides: Partial<ApiLanguageSettings> = {}): ApiLanguageSettings {
	return {
		metadataLanguage: 'en',
		tmdbLanguage: INHERIT_LANGUAGE,
		wikipediaLanguage: INHERIT_LANGUAGE,
		steamLanguage: INHERIT_LANGUAGE,
		vndbLanguage: INHERIT_LANGUAGE,
		openLibraryLanguage: INHERIT_LANGUAGE,
		malTitleLanguage: INHERIT_LANGUAGE,
		...overrides,
	};
}

test('maps global ISO codes to TMDB, Steam, Wikipedia, VNDB, and Open Library', () => {
	expect(mapToTmdbLanguage('fr')).toBe('fr');
	expect(mapToTmdbLanguage('fr-FR')).toBe('fr-FR');
	expect(mapToTmdbLanguage('zh-CN')).toBe('zh-CN');
	expect(mapToTmdbLanguage('zh')).toBe('zh-CN');
	expect(mapToTmdbLanguage('pt-BR')).toBe('pt-BR');
	expect(mapToTmdbLanguage('nb')).toBe('nb-NO');

	expect(mapToSteamLanguage('fr')).toBe('french');
	expect(mapToSteamLanguage('zh-CN')).toBe('schinese');
	expect(mapToSteamLanguage('zh-TW')).toBe('tchinese');
	expect(mapToSteamLanguage('pt-BR')).toBe('brazilian');
	expect(mapToSteamLanguage('es-MX')).toBe('latam');
	expect(mapToSteamLanguage('ko')).toBe('koreana');
	expect(mapToSteamLanguage('aa')).toBe('english');

	expect(mapToWikipediaLanguage('fr')).toBe('fr');
	expect(mapToWikipediaLanguage('zh-TW')).toBe('zh');
	expect(mapToWikipediaLanguage('simple')).toBe('simple');
	expect(mapToWikipediaLanguage('ceb')).toBe('ceb');

	expect(mapToVndbLanguage('ja')).toBe('ja');
	expect(mapToVndbLanguage('zh-CN')).toBe('zh-Hans');
	expect(mapToVndbLanguage('zh-TW')).toBe('zh-Hant');
	expect(mapToVndbLanguage('pt-BR')).toBe('pt-br');

	expect(mapToOpenLibraryLanguage('fr')).toBe('fre');
	expect(mapToOpenLibraryLanguage('de')).toBe('ger');
	expect(mapToOpenLibraryLanguage('zh-CN')).toBe('chi');
	expect(mapToOpenLibraryLanguage('en')).toBe('eng');
});

test('resolves inherit vs per-API overrides', () => {
	expect(resolveTmdbLanguage(settings({ metadataLanguage: 'ja' }))).toBe('ja');
	expect(resolveTmdbLanguage(settings({ metadataLanguage: 'ja', tmdbLanguage: 'fr-FR' }))).toBe('fr-FR');

	expect(resolveWikipediaLanguage(settings({ metadataLanguage: 'de' }))).toBe('de');
	expect(resolveWikipediaLanguage(settings({ wikipediaLanguage: 'simple' }))).toBe('simple');

	expect(resolveSteamLanguage(settings({ metadataLanguage: 'ru' }))).toBe('russian');
	expect(resolveSteamLanguage(settings({ steamLanguage: 'koreana' }))).toBe('koreana');

	expect(resolveVndbLanguage(settings({ metadataLanguage: 'zh-CN' }))).toBe('zh-Hans');
	expect(resolveVndbLanguage(settings({ vndbLanguage: 'ja' }))).toBe('ja');

	expect(resolveOpenLibraryLanguage(settings({ metadataLanguage: 'it' }))).toBe('ita');
	expect(resolveOpenLibraryLanguage(settings({ openLibraryLanguage: 'fre' }))).toBe('fre');
});

test('keeps English Open Library search unfiltered and appends a language filter otherwise', () => {
	expect(withOpenLibraryLanguageFilter('Dune', 'eng')).toBe('Dune');
	expect(withOpenLibraryLanguageFilter('Dune', 'en')).toBe('Dune');
	expect(withOpenLibraryLanguageFilter('Dune', 'fre')).toBe('Dune language:fre');
});

test('picks MAL and VNDB titles with fallbacks', () => {
	expect(resolveMalTitlePreference(settings({ metadataLanguage: 'en' }))).toBe('english');
	expect(resolveMalTitlePreference(settings({ metadataLanguage: 'ja' }))).toBe('japanese');
	expect(resolveMalTitlePreference(settings({ metadataLanguage: 'fr' }))).toBe('default');
	expect(resolveMalTitlePreference(settings({ malTitleLanguage: 'japanese' }))).toBe('japanese');

	expect(
		pickMalTitle('english', {
			defaultTitle: 'Kimetsu no Yaiba',
			english: 'Demon Slayer',
			japanese: '鬼滅の刃',
		}),
	).toBe('Demon Slayer');
	expect(
		pickMalTitle('english', {
			defaultTitle: 'Kimetsu no Yaiba',
			english: null,
			japanese: '鬼滅の刃',
		}),
	).toBe('Kimetsu no Yaiba');

	expect(
		pickVndbTitle(
			[
				{ title: 'Clannad', lang: 'en' },
				{ title: 'クラナド', lang: 'ja' },
			],
			'ja',
			'Clannad',
		),
	).toBe('クラナド');
	expect(pickVndbTitle([{ title: 'Clannad', lang: 'en' }], 'fr', 'Clannad')).toBe('Clannad');
});

test('rejects unsafe Wikipedia language codes and accepts real editions', () => {
	expect(isSafeWikiLanguage('fr')).toBe(true);
	expect(isSafeWikiLanguage('zh-yue')).toBe(true);
	expect(isSafeWikiLanguage('simple')).toBe(true);
	expect(isSafeWikiLanguage('en.wikipedia.org/evil')).toBe(false);
	expect(isSafeWikiLanguage('../fr')).toBe(false);
	expect(resolveWikipediaLanguage(settings({ wikipediaLanguage: '../fr' }))).toBe('en');
});

test('language lists include the requested API coverage', () => {
	expect(STEAM_LANGUAGES.length).toBeGreaterThanOrEqual(29);
	expect(VNDB_LANGUAGES.length).toBeGreaterThanOrEqual(40);
	expect(WIKIPEDIA_LANGUAGES.length).toBeGreaterThanOrEqual(250);
	expect(parseLanguageInput('French', WIKIPEDIA_LANGUAGES)).toBe('fr');
	expect(parseLanguageInput('fr', WIKIPEDIA_LANGUAGES)).toBe('fr');
});
