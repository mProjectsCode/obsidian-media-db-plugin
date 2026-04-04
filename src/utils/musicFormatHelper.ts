import type MediaDbPlugin from '../main';
import { ArtistModel } from '../models/ArtistModel';
import { MusicReleaseModel } from '../models/MusicReleaseModel';
import { coerceYear } from './Utils';

export function artistTitleWikilink(artistTitle: string, plugin: MediaDbPlugin): string {
	const title = artistTitle.trim();
	const artistModel = new ArtistModel({
		type: 'artist',
		title,
		englishTitle: title,
		year: 0,
		beginYear: '',
		releaseDate: '',
		dataSource: '',
		url: '',
		id: '',
		country: '',
		disambiguation: '',
		isni: '',
		genres: [],
		image: '',
		officialWebsite: '',
		subType: 'artist',
		userData: { personalRating: 0 },
	});
	const linkTarget = plugin.mediaTypeManager.getFileName(artistModel);
	if (linkTarget === title) {
		return `[[${linkTarget}]]`;
	}
	return `[[${linkTarget}|${title}]]`;
}

export function songAlbumTitleWikilink(albumTitle: string, songMeta: Record<string, unknown>, plugin: MediaDbPlugin): string {
	const title = albumTitle.trim();
	const artistsRaw = songMeta.artists;
	const artists = Array.isArray(artistsRaw)
		? artistsRaw.filter((a): a is string => typeof a === 'string')
		: [];
	const year = coerceYear(songMeta.year);
	const releaseModel = new MusicReleaseModel({
		type: 'musicRelease',
		title,
		englishTitle: title,
		year,
		releaseDate: '',
		dataSource: '',
		url: '',
		id: '',
		image: '',
		artists,
		genres: [],
		subType: 'album',
		language: '',
		rating: 0,
		userData: { personalRating: 0 },
	});
	const linkTarget = plugin.mediaTypeManager.getFileName(releaseModel);
	if (linkTarget === title) {
		return `[[${linkTarget}]]`;
	}
	return `[[${linkTarget}|${title}]]`;
}
