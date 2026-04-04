import { MediaType } from '../utils/MediaType';
import type { ModelToData } from '../utils/Utils';
import { applyPlainObject, mediaDbTag } from '../utils/Utils';
import { MediaTypeModel } from './MediaTypeModel';

export type SongData = ModelToData<SongModel>;

export class SongModel extends MediaTypeModel {
	genres: string[];
	artists: string[];
	albumTitle: string;
	albumReleaseGroupId: string;
	trackNumber: number;
	duration: string;
	featuredArtists: string[];
	geniusUrl: string;
	/** Open track URL from MusicBrainz (e.g. https://open.spotify.com/track/…) when available. */
	spotifyUrl: string;
	lyrics: string;
	image: string;
	releaseDate: string;

	userData: {
		personalRating: number;
	};

	constructor(obj: SongData) {
		super();

		this.genres = [];
		this.artists = [];
		this.albumTitle = '';
		this.albumReleaseGroupId = '';
		this.trackNumber = 0;
		this.duration = '';
		this.featuredArtists = [];
		this.geniusUrl = '';
		this.spotifyUrl = '';
		this.lyrics = '';
		this.image = '';
		this.releaseDate = '';

		this.userData = {
			personalRating: 0,
		};

		applyPlainObject(this, obj, this);

		if (!Object.hasOwn(obj, 'userData')) {
			applyPlainObject(this.userData, obj, this.userData);
		}

		this.type = this.getMediaType();
		this.trackNumber = obj.trackNumber ?? 0;
		this.albumTitle = obj.albumTitle ?? '';
		this.albumReleaseGroupId = obj.albumReleaseGroupId ?? '';
		this.duration = obj.duration ?? '';
		this.featuredArtists = obj.featuredArtists ?? [];
		this.geniusUrl = obj.geniusUrl ?? '';
		this.spotifyUrl = obj.spotifyUrl ?? '';
		this.lyrics = obj.lyrics ?? '';
		this.releaseDate = obj.releaseDate ?? '';
	}

	getTags(): string[] {
		return [mediaDbTag, 'music', 'song'];
	}

	getMediaType(): MediaType {
		return MediaType.Song;
	}

	getSummary(): string {
		const albumPart = this.albumTitle ? ` — ${this.albumTitle}` : '';
		const artists = this.artists.length > 0 ? this.artists.join(', ') : '';
		return `${this.title}${albumPart}${artists ? ` (${artists})` : ''}`;
	}

	getWithOutUserData(): Record<string, unknown> {
		const copy = super.getWithOutUserData();
		delete copy.lyrics;
		return copy;
	}
}
