import type MediaDbPlugin from 'src/main';
import type { ApiSecretId } from './apiSecretIds';
import { API_SECRET_IDS } from './apiSecretIds';
import type { MediaDbPluginSettings } from './Settings';

const LEGACY_KEY_PAIRS: { id: ApiSecretId; legacy: keyof MediaDbPluginSettings }[] = [
	{ id: API_SECRET_IDS.omdb, legacy: 'OMDbKey' },
	{ id: API_SECRET_IDS.tmdb, legacy: 'TMDBKey' },
	{ id: API_SECRET_IDS.mobyGames, legacy: 'MobyGamesKey' },
	{ id: API_SECRET_IDS.giantBomb, legacy: 'GiantBombKey' },
	{ id: API_SECRET_IDS.igdbClientId, legacy: 'IGDBClientId' },
	{ id: API_SECRET_IDS.igdbClientSecret, legacy: 'IGDBClientSecret' },
	{ id: API_SECRET_IDS.rawg, legacy: 'RAWGAPIKey' },
	{ id: API_SECRET_IDS.comicVine, legacy: 'ComicVineKey' },
	{ id: API_SECRET_IDS.boardgameGeek, legacy: 'BoardgameGeekKey' },
];

/** Move plaintext API keys from data.json into Obsidian SecretStorage and clear legacy fields. */
export function migrateLegacyApiKeysToSecretStorage(plugin: MediaDbPlugin): void {
	const storage = plugin.app.secretStorage;
	const { settings } = plugin;
	let dirty = false;

	for (const { id, legacy } of LEGACY_KEY_PAIRS) {
		const plaintext = settings[legacy];
		if (typeof plaintext !== 'string' || plaintext === '') {
			continue;
		}
		if (!storage.getSecret(id)) {
			storage.setSecret(id, plaintext);
		}
		dirty = true;
	}
	if (dirty) {
		stripPlaintextApiKeysFromSettings(settings);
		void plugin.saveSettings();
	}
}

/** Prevent API keys from being written to data.json (defense in depth). */
export function stripPlaintextApiKeysFromSettings(settings: MediaDbPluginSettings): void {
	settings.OMDbKey = '';
	settings.TMDBKey = '';
	settings.MobyGamesKey = '';
	settings.GiantBombKey = '';
	settings.IGDBClientId = '';
	settings.IGDBClientSecret = '';
	settings.RAWGAPIKey = '';
	settings.ComicVineKey = '';
	settings.BoardgameGeekKey = '';
}

function getSecret(plugin: MediaDbPlugin, id: ApiSecretId): string {
	return plugin.app.secretStorage.getSecret(id) ?? '';
}

export const apiSecrets = {
	omdb: (p: MediaDbPlugin): string => getSecret(p, API_SECRET_IDS.omdb),
	tmdb: (p: MediaDbPlugin): string => getSecret(p, API_SECRET_IDS.tmdb),
	mobyGames: (p: MediaDbPlugin): string => getSecret(p, API_SECRET_IDS.mobyGames),
	giantBomb: (p: MediaDbPlugin): string => getSecret(p, API_SECRET_IDS.giantBomb),
	igdbClientId: (p: MediaDbPlugin): string => getSecret(p, API_SECRET_IDS.igdbClientId),
	igdbClientSecret: (p: MediaDbPlugin): string => getSecret(p, API_SECRET_IDS.igdbClientSecret),
	rawg: (p: MediaDbPlugin): string => getSecret(p, API_SECRET_IDS.rawg),
	comicVine: (p: MediaDbPlugin): string => getSecret(p, API_SECRET_IDS.comicVine),
	boardgameGeek: (p: MediaDbPlugin): string => getSecret(p, API_SECRET_IDS.boardgameGeek),
};
