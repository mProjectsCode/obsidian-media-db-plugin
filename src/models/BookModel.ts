import { MediaType } from '../utils/MediaType';
import type { ModelToData } from '../utils/Utils';
import { mediaDbTag, migrateObject } from '../utils/Utils';
import { MediaTypeModel } from './MediaTypeModel';

export type BookData = ModelToData<BookModel>;

export class BookModel extends MediaTypeModel {
	author: string;
	plot: string;
	pages: number;
	image: string;
	onlineRating: number;
	isbn: number;
	isbn13: number;

	released: boolean;

	userData: {
		read: boolean;
		lastRead: string;
		personalRating: number;
	};

	constructor(obj: BookData) {
		super();

		this.author = '';
		this.plot = '';
		this.pages = 0;
		this.image = '';
		this.onlineRating = 0;
		this.isbn = 0;
		this.isbn13 = 0;

		this.released = false;

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
		return [mediaDbTag, 'book'];
	}

	getMediaType(): MediaType {
		return MediaType.Book;
	}

	getSummary(): string {
		return this.englishTitle + ' (' + this.year + ') - ' + this.author;
	}
}
