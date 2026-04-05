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

export type MusicBrainzReleaseGroupPrimaryTypeId = (typeof MUSICBRAINZ_RELEASE_GROUP_PRIMARY_TYPES)[number]['id'];

export const DEFAULT_RELEASE_GROUP_PRIMARY_TYPES: Record<MusicBrainzReleaseGroupPrimaryTypeId, boolean> = {
	Album: true,
	EP: false,
	Single: false,
	Broadcast: false,
	Other: false,
};

export function enabledReleaseGroupPrimaryTypeIds(
	settings: Record<MusicBrainzReleaseGroupPrimaryTypeId, boolean>,
): MusicBrainzReleaseGroupPrimaryTypeId[] {
	return MUSICBRAINZ_RELEASE_GROUP_PRIMARY_TYPES.filter(t => settings[t.id]).map(t => t.id);
}

export function normalizeReleaseGroupPrimaryTypes(
	raw: Record<MusicBrainzReleaseGroupPrimaryTypeId, boolean> | undefined,
): Record<MusicBrainzReleaseGroupPrimaryTypeId, boolean> {
	const out: Record<MusicBrainzReleaseGroupPrimaryTypeId, boolean> = { ...DEFAULT_RELEASE_GROUP_PRIMARY_TYPES };
	if (!raw || typeof raw !== 'object') {
		return out;
	}
	for (const t of MUSICBRAINZ_RELEASE_GROUP_PRIMARY_TYPES) {
		const v = raw[t.id];
		out[t.id] = typeof v === 'boolean' ? v : DEFAULT_RELEASE_GROUP_PRIMARY_TYPES[t.id];
	}
	return out;
}

/**
 * Whether a release group’s `primary-type` is enabled for import/search.
 */
export function releaseGroupMatchesPrimaryTypeImportFilter(
	primaryType: string | undefined,
	enabled: Record<MusicBrainzReleaseGroupPrimaryTypeId, boolean>,
): boolean {
	if (!primaryType) {
		return false;
	}
	for (const t of MUSICBRAINZ_RELEASE_GROUP_PRIMARY_TYPES) {
		if (t.id === primaryType) {
			return enabled[t.id];
		}
	}
	return false;
}

/**
 * Import filters not represented as MusicBrainz `secondary-types`; inferred from the release group title.
 */
export const INFERRED_RELEASE_GROUP_SECONDARY_TYPES = [
	{
		id: 'Instrumental',
		label: 'Instrumental',
		/** When the title contains this substring, treat like a secondary tag for filtering. */
		titleIncludes: '(Instrumental)',
		defaultAllowed: true,
	},
] as const;

export type MusicBrainzReleaseGroupSecondaryTypeId = (typeof MUSICBRAINZ_RELEASE_GROUP_SECONDARY_TYPES)[number]['id'];

export type InferredReleaseGroupSecondaryTypeId =
	(typeof INFERRED_RELEASE_GROUP_SECONDARY_TYPES)[number]['id'];

export type ReleaseGroupSecondaryTypeId = MusicBrainzReleaseGroupSecondaryTypeId | InferredReleaseGroupSecondaryTypeId;

export const DEFAULT_RELEASE_GROUP_SECONDARY_TYPES: Record<ReleaseGroupSecondaryTypeId, boolean> = {
	...Object.fromEntries(MUSICBRAINZ_RELEASE_GROUP_SECONDARY_TYPES.map(t => [t.id, t.defaultAllowed])),
	...Object.fromEntries(INFERRED_RELEASE_GROUP_SECONDARY_TYPES.map(t => [t.id, t.defaultAllowed])),
} as Record<ReleaseGroupSecondaryTypeId, boolean>;

export function normalizeReleaseGroupSecondaryTypes(
	raw: Record<ReleaseGroupSecondaryTypeId, boolean> | undefined,
): Record<ReleaseGroupSecondaryTypeId, boolean> {
	const out: Record<ReleaseGroupSecondaryTypeId, boolean> = { ...DEFAULT_RELEASE_GROUP_SECONDARY_TYPES };
	if (!raw || typeof raw !== 'object') {
		return out;
	}
	for (const t of MUSICBRAINZ_RELEASE_GROUP_SECONDARY_TYPES) {
		const v = raw[t.id];
		out[t.id] = typeof v === 'boolean' ? v : DEFAULT_RELEASE_GROUP_SECONDARY_TYPES[t.id];
	}
	for (const t of INFERRED_RELEASE_GROUP_SECONDARY_TYPES) {
		const v = raw[t.id];
		out[t.id] = typeof v === 'boolean' ? v : DEFAULT_RELEASE_GROUP_SECONDARY_TYPES[t.id];
	}
	return out;
}

const CONFIGURABLE_SECONDARY_IDS = new Set<string>(MUSICBRAINZ_RELEASE_GROUP_SECONDARY_TYPES.map(t => t.id));

/**
 * Whether a release group may be imported given its MusicBrainz `secondary-types` and the user’s toggles.
 * Any secondary tag not in {@link MUSICBRAINZ_RELEASE_GROUP_SECONDARY_TYPES} blocks import.
 */
function releaseGroupPassesMusicBrainzSecondaryTypeFilter(
	secondaryTypes: string[] | undefined,
	allowed: Record<ReleaseGroupSecondaryTypeId, boolean>,
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

/**
 * Whether a release group may be imported or listed in search given MB `secondary-types`, inferred title-based tags
 * (see {@link INFERRED_RELEASE_GROUP_SECONDARY_TYPES}), and the user’s toggles.
 */
export function releaseGroupPassesImportSecondaryFilter(
	secondaryTypes: string[] | undefined,
	releaseGroupTitle: string,
	allowed: Record<ReleaseGroupSecondaryTypeId, boolean>,
): boolean {
	if (!releaseGroupPassesMusicBrainzSecondaryTypeFilter(secondaryTypes, allowed)) {
		return false;
	}
	for (const t of INFERRED_RELEASE_GROUP_SECONDARY_TYPES) {
		if (releaseGroupTitle.includes(t.titleIncludes) && !allowed[t.id]) {
			return false;
		}
	}
	return true;
}
