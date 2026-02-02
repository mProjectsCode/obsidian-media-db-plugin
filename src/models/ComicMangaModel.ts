import { MediaType } from '../utils/MediaType';
import type { ModelToData } from '../utils/Utils';
import { mediaDbTag, migrateObject } from '../utils/Utils';
import { MediaTypeModel } from './MediaTypeModel';

export type ComicMangaData = ModelToData<ComicMangaModel>;

export class ComicMangaModel extends MediaTypeModel {
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
	publishers: string[];
	publishedFrom: string;
	publishedTo: string;

	userData: {
		read: boolean;
		lastRead: string;
		personalRating: number;
	};

	constructor(obj: ComicMangaData) {
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
		this.publishers = [];
		this.publishedFrom = '';
		this.publishedTo = '';

		this.userData = {
			read: false,
			lastRead: '',
			personalRating: 0,
		};

		migrateObject(this, obj, this);

		if (!Object.hasOwn(obj, 'userData')) {
			migrateObject(this.userData, obj, this.userData);
		}

		this.type = this.getMediaType();
	}

	getTags(): string[] {
		const tags = [mediaDbTag];
		if (this.subType) {
			tags.push(this.subType);
		} else {
			tags.push('comicManga');
		}
		return tags;
	}

	getMediaType(): MediaType {
		return MediaType.ComicManga;
	}

	getSummary(): string {
		return this.title + ' (' + this.year + ')';
	}
}
