import { MediaType } from '../utils/MediaType';
import type { ModelToData } from '../utils/Utils';
import { applyPlainObject, coerceMovieDurationMinutes, mediaDbTag } from '../utils/Utils';
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

		applyPlainObject(this, obj, this);
		this.duration = coerceMovieDurationMinutes(this.duration as unknown);

		if (!Object.hasOwn(obj, 'userData')) {
			applyPlainObject(this.userData, obj, this.userData);
		}

		this.type = this.getMediaType();
	}

	override toMetaDataObject(): Record<string, unknown> {
		const data = this.getWithOutUserData();
		const genreTags = movieGenresToTags(this.genres);
		return {
			...data,
			...this.userData,
			tags: [this.getTags().join('/'), ...genreTags],
		};
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

function movieGenresToTags(genres: string[]): string[] {
	return genres.filter((g): g is string => typeof g === 'string' && g.length > 0).map(g => `genre/movie/${g}`);
}
