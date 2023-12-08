import { MediaTypeModel } from './MediaTypeModel';
import { mediaDbTag, migrateObject } from '../utils/Utils';
import { MediaType } from '../utils/MediaType';

export class MangaModel extends MediaTypeModel {
	type: string;
	subType: string;
	title: string;
	plot: string;
	englishTitle: string;
	alternateTitles: string[];
	year: string;
	dataSource: string;
	url: string;
	id: string;

	genres: string[];
	authors: string[];
	chapters: number;
	volumes: number;
	onlineRating: number;
	image: string;

	released: boolean;
	status: string;
	publishedFrom: string;
	publishedTo: string;

	userData: {
		watched: boolean;
		lastWatched: string;
		personalRating: number;
	};

	constructor(obj: any = {}) {
		super();

		this.plot = undefined;
		this.genres = undefined;
		this.authors = undefined;
		this.alternateTitles = undefined;
		this.chapters = undefined;
		this.volumes = undefined;
		this.onlineRating = undefined;
		this.image = undefined;

		this.released = undefined;
		this.status = undefined;
		this.publishedFrom = undefined;
		this.publishedTo = undefined;

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
		return [mediaDbTag, 'manga', 'light-novel'];
	}

	getMediaType(): MediaType {
		return MediaType.Manga;
	}

	getSummary(): string {
		return this.title + ' (' + this.year + ')';
	}
}
