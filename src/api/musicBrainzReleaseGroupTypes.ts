/**
 * MusicBrainz release group primary types (JSON field `primary-type`) and browse API `type=` values.
 * @see https://musicbrainz.org/doc/MusicBrainz_API/Types
 */
export const MUSICBRAINZ_RELEASE_GROUP_PRIMARY_TYPES = [
	{
		id: 'Album',
		browseParam: 'album',
		label: 'Album'
	},
	{
		id: 'EP',
		browseParam: 'ep',
		label: 'EP'
	},
	{
		id: 'Single',
		browseParam: 'single',
		label: 'Single'
	},
	{
		id: 'Broadcast',
		browseParam: 'broadcast',
		label: 'Broadcast'
	},
	{
		id: 'Other',
		browseParam: 'other',
		label: 'Other'
	},
] as const;

export type MusicBrainzReleaseGroupPrimaryTypeId = (typeof MUSICBRAINZ_RELEASE_GROUP_PRIMARY_TYPES)[number]['id'];

export type ArtistDiscographyReleasePrimaryTypes = Record<MusicBrainzReleaseGroupPrimaryTypeId, boolean>;

export const DEFAULT_ARTIST_DISCOGRAPHY_RELEASE_PRIMARY_TYPES: ArtistDiscographyReleasePrimaryTypes = {
	Album: true,
	EP: false,
	Single: false,
	Broadcast: false,
	Other: false,
};

export function enabledMusicBrainzPrimaryTypeIds(settings: ArtistDiscographyReleasePrimaryTypes): MusicBrainzReleaseGroupPrimaryTypeId[] {
	return MUSICBRAINZ_RELEASE_GROUP_PRIMARY_TYPES.filter(t => settings[t.id]).map(t => t.id);
}

export function normalizeArtistDiscographyReleasePrimaryTypes(
	raw: ArtistDiscographyReleasePrimaryTypes | undefined,
): ArtistDiscographyReleasePrimaryTypes {
	const out: ArtistDiscographyReleasePrimaryTypes = { ...DEFAULT_ARTIST_DISCOGRAPHY_RELEASE_PRIMARY_TYPES };
	if (!raw || typeof raw !== 'object') {
		return out;
	}
	for (const t of MUSICBRAINZ_RELEASE_GROUP_PRIMARY_TYPES) {
		const v = raw[t.id];
		out[t.id] = typeof v === 'boolean' ? v : DEFAULT_ARTIST_DISCOGRAPHY_RELEASE_PRIMARY_TYPES[t.id];
	}
	return out;
}

/** Short summary for the settings row (e.g. “Album, EP”). */
export function formatArtistDiscographyReleaseTypesSummary(types: ArtistDiscographyReleasePrimaryTypes): string {
	const labels = MUSICBRAINZ_RELEASE_GROUP_PRIMARY_TYPES.filter(t => types[t.id]).map(t => t.label);
	if (labels.length === 0) {
		return 'None';
	}
	return labels.join(', ');
}

/**
 * MusicBrainz `secondary-types` values for release groups (exact API strings).
 * @see https://musicbrainz.org/doc/Release_Group/Type
 */
export const MUSICBRAINZ_RELEASE_GROUP_SECONDARY_TYPES = [
	{
		id: 'Compilation',
		label: 'Compilation',
		defaultAllowed: false,
	},
	{
		id: 'Live',
		label: 'Live',
		defaultAllowed: false,
	},
	{
		id: 'Soundtrack',
		label: 'Soundtrack',
		defaultAllowed: false,
	},
	{
		id: 'Mixtape/Street',
		label: 'Mixtape / street',
		defaultAllowed: false,
	},
	{
		id: 'Remix',
		label: 'Remix',
		defaultAllowed: false,
	},
	{
		id: 'DJ-mix',
		label: 'DJ-mix',
		defaultAllowed: false,
	},
	{
		id: 'Demo',
		label: 'Demo',
		defaultAllowed: false,
	}
] as const;

export type MusicBrainzReleaseGroupSecondaryTypeId = (typeof MUSICBRAINZ_RELEASE_GROUP_SECONDARY_TYPES)[number]['id'];

export type ArtistDiscographyReleaseSecondaryTypes = Record<MusicBrainzReleaseGroupSecondaryTypeId, boolean>;

export const DEFAULT_ARTIST_DISCOGRAPHY_RELEASE_SECONDARY_TYPES: ArtistDiscographyReleaseSecondaryTypes =
	Object.fromEntries(MUSICBRAINZ_RELEASE_GROUP_SECONDARY_TYPES.map(t => [t.id, t.defaultAllowed])) as ArtistDiscographyReleaseSecondaryTypes;

export function normalizeArtistDiscographyReleaseSecondaryTypes(
	raw: ArtistDiscographyReleaseSecondaryTypes | undefined,
): ArtistDiscographyReleaseSecondaryTypes {
	const out: ArtistDiscographyReleaseSecondaryTypes = { ...DEFAULT_ARTIST_DISCOGRAPHY_RELEASE_SECONDARY_TYPES };
	if (!raw || typeof raw !== 'object') {
		return out;
	}
	for (const t of MUSICBRAINZ_RELEASE_GROUP_SECONDARY_TYPES) {
		const v = raw[t.id];
		out[t.id] = typeof v === 'boolean' ? v : DEFAULT_ARTIST_DISCOGRAPHY_RELEASE_SECONDARY_TYPES[t.id];
	}
	return out;
}

const CONFIGURABLE_SECONDARY_IDS = new Set<string>(MUSICBRAINZ_RELEASE_GROUP_SECONDARY_TYPES.map(t => t.id));

/**
 * Whether a release group may be imported given its `secondary-types` and the user’s toggles.
 * Any secondary tag not in {@link MUSICBRAINZ_RELEASE_GROUP_SECONDARY_TYPES} blocks import.
 */
export function releaseGroupPassesSecondaryTypeFilter(
	secondaryTypes: string[] | undefined,
	allowed: ArtistDiscographyReleaseSecondaryTypes,
): boolean {
	for (const sec of secondaryTypes ?? []) {
		if (!CONFIGURABLE_SECONDARY_IDS.has(sec)) {
			return false;
		}
		const id = sec as MusicBrainzReleaseGroupSecondaryTypeId;
		if (!allowed[id]) {
			return false;
		}
	}
	return true;
}

/** Short summary of allowed secondary tags (for settings copy). */
export function formatArtistDiscographyReleaseSecondarySummary(allowed: ArtistDiscographyReleaseSecondaryTypes): string {
	const labels = MUSICBRAINZ_RELEASE_GROUP_SECONDARY_TYPES.filter(t => allowed[t.id]).map(t => t.label);
	if (labels.length === 0) {
		return 'None';
	}
	return labels.join(', ');
}
