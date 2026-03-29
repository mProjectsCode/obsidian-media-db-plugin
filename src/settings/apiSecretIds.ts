/**
 * Obsidian SecretStorage IDs (lowercase alphanumeric + dashes only).
 * @see https://docs.obsidian.md/plugins/guides/secret-storage
 */
export const API_SECRET_IDS = {
	omdb: 'media-db-omdb',
	tmdb: 'media-db-tmdb',
	mobyGames: 'media-db-moby-games',
	giantBomb: 'media-db-giant-bomb',
	igdbClientId: 'media-db-igdb-client-id',
	igdbClientSecret: 'media-db-igdb-client-secret',
	rawg: 'media-db-rawg',
	comicVine: 'media-db-comic-vine',
	boardgameGeek: 'media-db-boardgame-geek',
	genius: 'media-db-genius',
} as const;

export type ApiSecretId = (typeof API_SECRET_IDS)[keyof typeof API_SECRET_IDS];
