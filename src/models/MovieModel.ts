import { MediaType } from '../utils/MediaType';
import type { ModelToData } from '../utils/Utils';
import { mediaDbTag, migrateObject } from '../utils/Utils';
import { MediaTypeModel } from './MediaTypeModel';

export type MovieData = ModelToData<MovieModel>;

export class MovieModel extends MediaTypeModel {
	plot: string;
	genres: string[];
	director: string[];
	writer: string[];
	studio: string[];
	duration: string;
	onlineRating: number;
	actors: string[];
	image: string;

	released: boolean;
	streamingServices: string[];
	premiere: string;

	userData: {
		watched: boolean;
		lastWatched: string;
		personalRating: number;
	};

	constructor(obj: MovieData) {
		super();

		this.plot = '';
		this.genres = [];
		this.director = [];
		this.writer = [];
		this.studio = [];
		this.duration = '';
		this.onlineRating = 0;
		this.actors = [];
		this.image = '';

		this.released = false;
		this.streamingServices = [];
		this.premiere = '';

		this.userData = {
			watched: false,
			lastWatched: '',
			personalRating: 0,
		};

		migrateObject(this, obj, this);

		if (!Object.hasOwn(obj, 'userData')) {
			migrateObject(this.userData, obj, this.userData);
		}

		this.type = this.getMediaType();
	}

	getTags(): string[] {
		return [mediaDbTag, 'tv', 'movie'];
	}

	getMediaType(): MediaType {
		return MediaType.Movie;
	}

	getSummary(): string {
		return this.englishTitle + ' (' + this.year + ')';
	}
}
