import { MediaTypeModel } from './MediaTypeModel';
import { mediaDbTag, migrateObject } from '../utils/Utils';
import { MediaType } from '../utils/MediaType';

export class SeriesModel extends MediaTypeModel {
	type: string;
	subType: string;
	title: string;
	nativeTitle: string;
	englishTitle: string;
	aliases: string[];
	year: string;
	dataSource: string;
	url: string;
	id: string;
	country: string;
	content_rating: string;

	plot: string;
	genres: string[];
	mediaTags: string[];
	relatedContent: string[];
	director: string[];
	writer: string[];
	studio: string[];
	episodes: number;
	duration: string;
	onlineRating: number;
	votes: number;
	ranked: number;
	popularity: number;
	watchers: number;
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
		this.episodes = undefined;
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
