import { MediaType } from '../utils/MediaType';
import type { ModelToData } from '../utils/Utils';
import { mediaDbTag, migrateObject } from '../utils/Utils';
import { MediaTypeModel } from './MediaTypeModel';

export type ComicBookData = ModelToData<ComicBookModel>;

export class ComicBookModel extends MediaTypeModel {
	creators: string[];
	publishers: string[];
	plot: string;
	issues: number;
	image: string;
	onlineRating: number;
	status: string;
	released: boolean;
	publishedFrom: string;
	publishedTo: string;

	userData: {
		read: boolean;
		lastRead: string;
		personalRating: number;
	};

	constructor(obj: ComicBookData) {
		super();

		this.creators = [];
		this.publishers = [];
		this.plot = '';
		this.issues = 0;
		this.image = '';
		this.onlineRating = 0;

		this.released = false;
		this.status = '';
		this.publishedFrom = '';
		this.publishedTo = '';

		this.userData = {
			read: false,
			lastRead: '',
			personalRating: 0,
		};

		migrateObject(this, obj, this);

		if (!obj.hasOwnProperty('userData')) {
			migrateObject(this.userData, obj, this.userData);
		}

		this.type = this.getMediaType();
	}

	getTags(): string[] {
		return [mediaDbTag, 'comicbook'];
	}

	getMediaType(): MediaType {
		return MediaType.ComicBook;
	}

	getSummary(): string {
		return this.englishTitle + ' (' + this.year + ') - ' + this.publishers;
	}
}
