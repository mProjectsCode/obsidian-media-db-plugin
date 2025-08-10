import { MediaType } from '../utils/MediaType';
import type { ModelToData } from '../utils/Utils';
import { mediaDbTag, migrateObject, getLanguageName } from '../utils/Utils';
import { MediaTypeModel } from './MediaTypeModel';

export type MusicReleaseData = ModelToData<MusicReleaseModel>;

export class MusicReleaseModel extends MediaTypeModel {
	genres: string[];
	artists: string[];
	language: string;
	image: string;
	rating: number;
	releaseDate: string;
	trackCount: number;
	tracks: {
		number: number;
		title: string;
		duration: string;
		featuredArtists: string[];
	}[];

	userData: {
		personalRating: number;
	};

	constructor(obj: MusicReleaseData) {
		super();

		this.genres = [];
		this.artists = [];
		this.image = '';
		this.rating = 0;
		this.releaseDate = '';

		this.userData = {
			personalRating: 0,
		};

		migrateObject(this, obj, this);

		if (!Object.hasOwn(obj, 'userData')) {
			migrateObject(this.userData, obj, this.userData);
		}

		this.type = this.getMediaType();
		this.trackCount = obj.trackCount ?? 0;
		this.tracks = obj.tracks ?? [];
		this.language = obj.language ?? '';
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
