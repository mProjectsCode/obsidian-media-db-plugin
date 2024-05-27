import { MediaTypeModel } from './MediaTypeModel';
import { mediaDbTag, migrateObject } from '../utils/Utils';
import { MediaType } from '../utils/MediaType';

export class SeriesModel extends MediaTypeModel {
	type: string;
	subType: string;
	title: string;
	englishTitle: string;
	year: string;
	dataSource: string;
	url: string;
	id: string;

	plot: string;
	genres: string[];
	writer: string[];
	studio: string[];
	episodes: number;
	duration: string;
	onlineRating: number;
	actors: string[];
	image: string;
	plot: string;

	released: boolean;
	streamingServices: string[];
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

		this.plot = undefined;
		this.genres = undefined;
		this.writer = undefined;
		this.studio = undefined;
		this.episodes = undefined;
		this.duration = undefined;
		this.onlineRating = undefined;
		this.actors = undefined;
		this.image = undefined;
		this.plot = undefined;

		this.released = undefined;
		this.streamingServices = undefined;
		this.airing = undefined;
		this.airedFrom = undefined;
		this.airedTo = undefined;

		this.userData = {
			watched: undefined,
			lastWatched: undefined,
			personalRating: undefined,
		};

		migrateObject(this, obj, this);

		if (!obj.hasOwnProperty('userData')) {
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
