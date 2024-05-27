import { MediaTypeModel } from './MediaTypeModel';
import { mediaDbTag, migrateObject } from '../utils/Utils';
import { MediaType } from '../utils/MediaType';

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
	plot: string;

	released: boolean;
	streamingServices: string[];
	premiere: string;

	userData: {
		watched: boolean;
		lastWatched: string;
		personalRating: number;
	};

	constructor(obj: any = {}) {
		super();

		this.plot = undefined;
		this.genres = undefined;
		this.director = undefined;
		this.writer = undefined;
		this.studio = undefined;
		this.duration = undefined;
		this.onlineRating = undefined;
		this.actors = undefined;
		this.image = undefined;
		this.plot = undefined;

		this.released = undefined;
		this.streamingServices = undefined;
		this.premiere = undefined;

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
		return [mediaDbTag, 'tv', 'movie'];
	}

	getMediaType(): MediaType {
		return MediaType.Movie;
	}

	getSummary(): string {
		return this.englishTitle + ' (' + this.year + ')';
	}
}
