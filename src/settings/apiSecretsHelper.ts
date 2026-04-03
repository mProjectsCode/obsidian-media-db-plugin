import type { App } from 'obsidian';

/**
 * Settings slots for API credentials. Each slot stores the Obsidian SecretStorage **id**
 * the user selects (including via SecretComponent → Link), not the raw secret.
 * @see https://docs.obsidian.md/plugins/guides/secret-storage
 */
export enum ApiSecretID {
	omdb,
	tmdb,
	mobyGames,
	giantBomb,
	igdbClientId,
	igdbClientSecret,
	rawg,
	comicVine,
	boardgameGeek,
	genius,
	/** Spotify Developer Dashboard — used when MusicBrainz has no streaming URL for a recording. */
	spotifyClientId,
	spotifyClientSecret,
}

export function getApiSecretValue(app: App, linked: Record<ApiSecretID, string> | undefined, slot: ApiSecretID): string {
	const id = linked?.[slot] ?? '';
	if (id === '') return '';
	return app.secretStorage.getSecret(id) ?? '';
}
