import {MediaTypeModel} from './MediaTypeModel';
import {mediaDbTag, migrateObject} from '../utils/Utils';
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

		this.genres = undefined;
		this.studios = undefined;
		this.episodes = undefined;
		this.duration = undefined;
		this.onlineRating = undefined;
		this.image = undefined;
		this.released = undefined;
		this.airing = undefined;
		this.airedFrom = undefined;
		this.airedTo = undefined;
		this.userData = {
			watched: undefined,
			lastWatched: undefined,
			personalRating: undefined,
		};

		migrateObject(this, obj, this);

		if(!obj.hasOwnProperty('userData')) {
			migrateObject(this.userData, obj, this.userData);
		}

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
