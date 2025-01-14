import { MediaType } from '../utils/MediaType';
import type { ModelToData } from '../utils/Utils';
import { mediaDbTag, migrateObject } from '../utils/Utils';
import { MediaTypeModel } from './MediaTypeModel';

export type MusicReleaseData = ModelToData<MusicReleaseModel>;

export class MusicReleaseModel extends MediaTypeModel {
	genres: string[];
	artists: string[];
	image: string;
	rating: number;

	userData: {
		personalRating: number;
	};

	constructor(obj: MusicReleaseData) {
		super();

		this.genres = [];
		this.artists = [];
		this.image = '';
		this.rating = 0;
		this.userData = {
			personalRating: 0,
		};

		migrateObject(this, obj, this);

		if (!obj.hasOwnProperty('userData')) {
			migrateObject(this.userData, obj, this.userData);
		}

		this.type = this.getMediaType();
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
