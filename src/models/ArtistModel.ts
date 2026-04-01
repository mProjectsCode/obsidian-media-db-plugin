import { MediaType } from '../utils/MediaType';
import type { ModelToData } from '../utils/Utils';
import { mediaDbTag, migrateObject } from '../utils/Utils';
import { MediaTypeModel } from './MediaTypeModel';

export type ArtistData = ModelToData<ArtistModel>;

export class ArtistModel extends MediaTypeModel {
	genres: string[];
	country: string;
	image: string;
	officialWebsite: string;
	disambiguation: string;
	/** ISNI(s) from the data source; comma-separated if multiple. */
	isni: string;
	beginYear: string;
	releaseDate: string;

	userData: {
		personalRating: number;
	};

	constructor(obj: ArtistData) {
		super();

		this.genres = [];
		this.country = '';
		this.image = '';
		this.officialWebsite = '';
		this.disambiguation = '';
		this.isni = '';
		this.beginYear = '';
		this.releaseDate = '';

		this.userData = {
			personalRating: 0,
		};

		migrateObject(this, obj, this);

		if (!Object.hasOwn(obj, 'userData')) {
			migrateObject(this.userData, obj, this.userData);
		}

		this.type = this.getMediaType();
		this.releaseDate = obj.releaseDate ?? '';
	}

	getTags(): string[] {
		return [mediaDbTag, 'music', 'artist'];
	}

	getMediaType(): MediaType {
		return MediaType.Artist;
	}

	getSummary(): string {
		let summary = this.title;
		if (this.beginYear) summary += ` (formed ${this.beginYear})`;
		if (this.disambiguation) summary += ` — ${this.disambiguation}`;
		return summary;
	}
}
