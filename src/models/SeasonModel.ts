import { MediaType } from '../utils/MediaType';
import type { ModelToData } from '../utils/Utils';
import { mediaDbTag, migrateObject } from '../utils/Utils';
import { MediaTypeModel } from './MediaTypeModel';

export type SeasonData = ModelToData<SeasonModel>;

export class SeasonModel extends MediaTypeModel {
	seasonNumber: number;
	seasonTitle: string;
	episodes: number;

	plot: string;
	genres: string[];
	writer: string[];
	studio: string[];
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

	constructor(obj: SeasonData) {
		super();
		this.seasonTitle = '';
		this.seasonNumber = 0;
		this.episodes = 0;
		this.plot = '';
		this.genres = [];
		this.writer = [];
		this.studio = [];
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
		return [mediaDbTag, 'tv', 'season'];
	}

	getMediaType(): MediaType {
		return MediaType.Season;
	}

	getSummary(): string {
		return this.seasonNumber + ' seasons';
	}
}
