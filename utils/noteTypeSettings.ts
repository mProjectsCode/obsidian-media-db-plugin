import type { MediaDbPluginSettings } from '../settings/Settings';
import { MEDIA_TYPES } from './MediaTypeManager';
import { MediaType } from './MediaType';

const MEDIA_TYPE_TO_NOTE_TYPE_KEY: Record<MediaType, keyof MediaDbPluginSettings> = {
	[MediaType.Artist]: 'artistNoteType',
	[MediaType.BoardGame]: 'boardgameNoteType',
	[MediaType.Book]: 'bookNoteType',
	[MediaType.ComicManga]: 'mangaNoteType',
	[MediaType.Game]: 'gameNoteType',
	[MediaType.Movie]: 'movieNoteType',
	[MediaType.MusicRelease]: 'musicReleaseNoteType',
	[MediaType.Season]: 'seasonNoteType',
	[MediaType.Series]: 'seriesNoteType',
	[MediaType.Song]: 'songNoteType',
	[MediaType.Wiki]: 'wikiNoteType',
};

/**
 * Value written to frontmatter `type` for this media kind. Falls back to the internal
 * {@link MediaType} string when the setting is empty.
 */
export function noteTypeValueForMedia(settings: MediaDbPluginSettings, mediaType: MediaType): string {
	const key = MEDIA_TYPE_TO_NOTE_TYPE_KEY[mediaType];
	const raw = settings[key];
	const s = typeof raw === 'string' ? raw.trim() : '';
	return s !== '' ? s : mediaType;
}

export function setNoteTypeForMedia(settings: MediaDbPluginSettings, mediaType: MediaType, value: string): void {
	const key = MEDIA_TYPE_TO_NOTE_TYPE_KEY[mediaType];
	(settings as unknown as Record<string, string>)[key as string] = value;
}

/**
 * Maps a frontmatter `type` string (legacy enum id or configured custom string) to {@link MediaType}.
 */
export function resolveMetadataTypeToMediaType(
	settings: MediaDbPluginSettings,
	noteType: unknown,
): MediaType | undefined {
	if (noteType === undefined || noteType === null) {
		return undefined;
	}
	let s = String(noteType).trim();
	if (s === '') {
		return undefined;
	}
	if (s === 'manga') {
		s = MediaType.ComicManga;
	}
	for (const mt of MEDIA_TYPES) {
		if (mt === s) {
			return mt;
		}
	}
	for (const mt of MEDIA_TYPES) {
		if (noteTypeValueForMedia(settings, mt) === s) {
			return mt;
		}
	}
	return undefined;
}
