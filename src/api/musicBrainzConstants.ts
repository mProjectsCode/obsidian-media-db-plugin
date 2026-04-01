import { MediaType } from '../utils/MediaType';

/** Stored on notes for any row backed by MusicBrainz (release, artist, or song). */
export const MUSICBRAINZ_NOTE_DATA_SOURCE = 'MusicBrainz';

export function isMusicBrainzFamilyDataSource(dataSource: string): boolean {
	return dataSource.contains('MusicBrainz');
}

/** Which registered API implements getById for this media type. */
export function musicBrainzRegisteredApiName(mediaType: MediaType): 'MusicBrainz API' | 'MusicBrainz Artist API' | undefined {
	if (mediaType === MediaType.Artist) {
		return 'MusicBrainz Artist API';
	}
	if (mediaType === MediaType.MusicRelease || mediaType === MediaType.Song) {
		return 'MusicBrainz API';
	}
	return undefined;
}
