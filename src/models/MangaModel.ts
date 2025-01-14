import { MediaType } from '../utils/MediaType';
import type {ModelToData} from '../utils/Utils';
import { mediaDbTag, migrateObject  } from '../utils/Utils';
import { MediaTypeModel } from './MediaTypeModel';

export type MangaData = ModelToData<MangaModel>;

export class MangaModel extends MediaTypeModel {
	plot: string;
	alternateTitles: string[];
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

	constructor(obj: MangaData) {
		super();

		this.plot = '';
		this.alternateTitles = [];
		this.genres = [];
		this.authors = [];
		this.chapters = 0;
		this.volumes = 0;
		this.onlineRating = 0;
		this.image = '';

		this.released = false;
		this.status = '';
		this.publishedFrom = '';
		this.publishedTo = '';

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
		return [mediaDbTag, 'manga', 'light-novel'];
	}

	getMediaType(): MediaType {
		return MediaType.Manga;
	}

	getSummary(): string {
		return this.title + ' (' + this.year + ')';
	}
}
