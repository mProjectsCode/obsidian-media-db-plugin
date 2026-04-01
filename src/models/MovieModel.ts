import { MediaType } from '../utils/MediaType';
import type { ModelToData } from '../utils/Utils';
import { coerceMovieDurationMinutes, mediaDbTag, migrateObject } from '../utils/Utils';
import { MediaTypeModel } from './MediaTypeModel';

export type MovieData = ModelToData<MovieModel>;

export class MovieModel extends MediaTypeModel {
	japaneseTitle: string;
	plot: string;
	genres: string[];
	director: string[];
	writer: string[];
	studio: string[];
	/** Total runtime in minutes. */
	duration: number;
	onlineRating: number;
	actors: string[];
	image: string;

	released: boolean;
	country: string[];
	language: string[];
	/** Production budget in USD (e.g. from TMDB). */
	budget: string;
	/** Box-office gross (e.g. worldwide from TMDB; OMDb US figure when from IMDb). */
	revenue: string;
	ageRating: string;
	streamingServices: string[];
	premiere: string;

	userData: {
		watched: boolean;
		lastWatched: string;
		personalRating: number;
	};

	constructor(obj: MovieData) {
		super();

		this.japaneseTitle = '';
		this.plot = '';
		this.genres = [];
		this.director = [];
		this.writer = [];
		this.studio = [];
		this.duration = 0;
		this.onlineRating = 0;
		this.actors = [];
		this.image = '';

		this.released = false;
		this.country = [];
		this.language = [];
		this.budget = '';
		this.revenue = '';
		this.ageRating = '';
		this.streamingServices = [];
		this.premiere = '';

		this.userData = {
			watched: false,
			lastWatched: '',
			personalRating: 0,
		};

		migrateObject(this, obj, this);
		this.duration = coerceMovieDurationMinutes(this.duration as unknown);

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
		return this.englishTitle + (this.year > 0 ? ` (${this.year})` : '');
	}
}
