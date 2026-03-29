import { MediaType } from '../utils/MediaType';
import type { ModelToData } from '../utils/Utils';
import { mediaDbTag, migrateObject } from '../utils/Utils';
import { MediaTypeModel } from './MediaTypeModel';

export type BandData = ModelToData<BandModel>;

export class BandModel extends MediaTypeModel {
	genres: string[];
	country: string;
	image: string;
	officialWebsite: string;
	disambiguation: string;
	beginYear: string;
	releaseDate: string;

	userData: {
		personalRating: number;
	};

	constructor(obj: BandData) {
		super();

		this.genres = [];
		this.country = '';
		this.image = '';
		this.officialWebsite = '';
		this.disambiguation = '';
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
		return [mediaDbTag, 'music', 'band'];
	}

	getMediaType(): MediaType {
		return MediaType.Band;
	}

	getSummary(): string {
		let summary = this.title;
		if (this.beginYear) summary += ` (formed ${this.beginYear})`;
		if (this.disambiguation) summary += ` — ${this.disambiguation}`;
		return summary;
	}
}
