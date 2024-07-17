import { MediaTypeModel } from './MediaTypeModel';
import { mediaDbTag, migrateObject } from '../utils/Utils';
import { MediaType } from '../utils/MediaType';

export class MovieModel extends MediaTypeModel {
	nativeTitle: string;
	aliases: string[];
	plot: string;
	genres: string[];
	mediaTags: string[];
	relatedContent: string[];
	director: string[];
	writer: string[];
	studio: string[];
	duration: string;
	onlineRating: number;
	votes: number;
	ranked: number;
	popularity: number;
	watchers: number;
	actors: string[];
	image: string;
	country: string;
	content_rating: string;

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

		this.nativeTitle = undefined;
		this.aliases = undefined;
		this.plot = undefined;
		this.genres = undefined;
		this.mediaTags = undefined;
		this.relatedContent = undefined;
		this.director = undefined;
		this.writer = undefined;
		this.studio = undefined;
		this.duration = undefined;
		this.onlineRating = undefined;
		this.votes = undefined;
		this.ranked = undefined;
		this.popularity = undefined;
		this.watchers = undefined;
		this.actors = undefined;
		this.image = undefined;
		this.country = undefined;
		this.content_rating = undefined;

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
