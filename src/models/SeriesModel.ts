import { MediaType } from '../utils/MediaType';
import { mediaDbTag, migrateObject, type ModelToData } from '../utils/Utils';
import { MediaTypeModel } from './MediaTypeModel';

export type SeriesData = ModelToData<SeriesModel>;

export class SeriesModel extends MediaTypeModel {
	plot: string;
	genres: string[];
	writer: string[];
	studio: string[];
	episodes: number;
	duration: string;
	onlineRating: number;
	actors: string[];
	image: string;

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

	constructor(obj: SeriesData) {
		super();

		this.plot = '';
		this.genres = [];
		this.writer = [];
		this.studio = [];
		this.episodes = 0;
		this.duration = '';
		this.onlineRating = 0;
		this.actors = [];
		this.image = '';

		this.released = false;
		this.streamingServices = [];
		this.airing = false;
		this.airedFrom = '';
		this.airedTo = '';

		this.userData = {
			watched: false,
			lastWatched: '',
			personalRating: 0,
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
