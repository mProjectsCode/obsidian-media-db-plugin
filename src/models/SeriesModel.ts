import {MediaTypeModel} from './MediaTypeModel';
import {mediaDbTag} from '../utils/Utils';
import {MediaType} from '../utils/MediaType';


export class SeriesModel extends MediaTypeModel {
	type: string;
	subType: string;
	title: string;
	englishTitle: string;
	year: string;
	dataSource: string;
	url: string;
	id: string;

	genres: string[];
	studios: string[];
	episodes: number;
	duration: string;
	onlineRating: number;
	image: string;

	released: boolean;
	airing: boolean;
	airedFrom: string;
	airedTo: string;

	userData: {
		watched: boolean;
		lastWatched: string;
		personalRating: number;
	};

	constructor(obj: any = {}) {
		super();

		Object.assign(this, obj);

		this.type = this.getMediaType();
	}

	getTags(): string[] {
		return [mediaDbTag, 'tv', 'series'];
	}

	getMediaType(): MediaType {
		return MediaType.Series;
	}

	getSummary(): string {
		return this.title + ' (' + this.year + ')';
	}
}
