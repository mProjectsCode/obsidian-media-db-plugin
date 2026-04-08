import { MediaType } from '../utils/MediaType';
import type { ModelToData } from '../utils/Utils';
import { applyPlainObject, mediaDbTag } from '../utils/Utils';
import { MediaTypeModel } from './MediaTypeModel';

export type MusicReleaseData = ModelToData<MusicReleaseModel>;

export class MusicReleaseModel extends MediaTypeModel {
	genres: string[];
	/** Obsidian-style tags derived from MusicBrainz release-group genres, e.g. `music/genre/indie rock`. */
	tags: string[];
	artists: string[];
	language: string;
	image: string;
	rating: number;
	releaseDate: string;
	albumDuration: string;
	trackCount: number;
	tracks: {
		number: number;
		title: string;
		duration: string;
		featuredArtists: string[];
		/** MusicBrainz recording MBID; used to resolve Spotify and other links. */
		recordingId?: string;
	}[];

	userData: {
		personalRating: number;
	};

	constructor(obj: MusicReleaseData) {
		super();

		this.genres = [];
		this.tags = [];
		this.artists = [];
		this.image = '';
		this.rating = 0;
		this.releaseDate = '';

		this.userData = {
			personalRating: 0,
		};

		applyPlainObject(this, obj, this);

		if (!Object.hasOwn(obj, 'userData')) {
			applyPlainObject(this.userData, obj, this.userData);
		}

		this.type = this.getMediaType();
		this.albumDuration = obj.albumDuration ?? '0:00';
		this.trackCount = obj.trackCount ?? 0;
		this.tracks = obj.tracks ?? [];
		this.language = obj.language ?? '';
	}

	override toMetaDataObject(): Record<string, unknown> {
		const data = this.getWithOutUserData();
		const genreTags = Array.isArray(data.tags)
			? (data.tags as unknown[]).filter((t): t is string => typeof t === 'string' && t.length > 0)
			: [];
		delete data.tags;
		return {
			...data,
			...this.userData,
			tags: [this.getTags().join('/'), ...genreTags],
		};
	}

	getTags(): string[] {
		return [mediaDbTag, 'music', this.subType];
	}

	getMediaType(): MediaType {
		return MediaType.MusicRelease;
	}

	getSummary(): string {
		let summary = this.title + ' (' + this.year + ')';
		if (this.artists.length > 0) summary += ' - ' + this.artists.join(', ');
		return summary;
	}
}
