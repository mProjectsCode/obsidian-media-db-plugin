import { MediaTypeModel } from './MediaTypeModel';
import { mediaDbTag, migrateObject } from '../utils/Utils';
import { MediaType } from '../utils/MediaType';

export class MusicReleaseModel extends MediaTypeModel {
	type: string;
	subType: string;
	title: string;
	englishTitle: string;
	year: string;
	dataSource: string;
	url: string;
	id: string;
	image: string;

	genres: string[];
	artists: string[];
	rating: number;

	userData: {
		personalRating: number;
	};

	constructor(obj: any = {}) {
		super();

		this.genres = undefined;
		this.artists = undefined;
		this.image = undefined;
		this.rating = undefined;
		this.userData = {
			personalRating: undefined,
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
