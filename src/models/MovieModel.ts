import { MediaTypeModel } from './MediaTypeModel';
import { mediaDbTag, migrateObject } from '../utils/Utils';
import { MediaType } from '../utils/MediaType';

export class MovieModel extends MediaTypeModel {
	plot: string;
	genres: string[];
	producer: string;
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

	constructor(obj: any = {}) {
		super();

		this.plot = undefined;
		this.genres = undefined;
		this.producer = undefined;
		this.duration = undefined;
		this.onlineRating = undefined;
		this.actors = undefined;
		this.image = undefined;

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