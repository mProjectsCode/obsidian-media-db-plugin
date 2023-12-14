import { MediaTypeModel } from './MediaTypeModel';
import { mediaDbTag, migrateObject } from '../utils/Utils';
import { MediaType } from '../utils/MediaType';

export class BookModel extends MediaTypeModel {
	author: string;
	plot: string;
	pages: number;
	image: string;
	onlineRating: number;
	english_title: string;

	released: boolean;

	userData: {
		read: boolean;
		lastRead: string;
		personalRating: number;
	};

	constructor(obj: any = {}) {
		super();

		this.author = undefined;
		this.pages = undefined;
		this.image = undefined;
		this.onlineRating = undefined;

		this.released = undefined;

		this.userData = {
			read: undefined,
			lastRead: undefined,
			personalRating: undefined,
		};

		migrateObject(this, obj, this);

		if (!obj.hasOwnProperty('userData')) {
			migrateObject(this.userData, obj, this.userData);
		}

		this.type = this.getMediaType();
	}

	getTags(): string[] {
		return [mediaDbTag, 'book'];
	}

	getMediaType(): MediaType {
		return MediaType.Book;
	}

	getSummary(): string {
		return this.englishTitle + ' (' + this.year + ')';
	}
}
