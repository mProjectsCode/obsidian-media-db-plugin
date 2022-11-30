import { MediaTypeModel } from './MediaTypeModel';
import { mediaDbTag, migrateObject } from '../utils/Utils';
import { MediaType } from '../utils/MediaType';

export class WikiModel extends MediaTypeModel {
	type: string;
	subType: string;
	title: string;
	englishTitle: string;
	year: string;
	dataSource: string;
	url: string;
	id: string;

	wikiUrl: string;
	lastUpdated: string;
	length: number;
	article: string;

	userData: {};

	constructor(obj: any = {}) {
		super();

		this.wikiUrl = undefined;
		this.lastUpdated = undefined;
		this.length = undefined;
		this.article = undefined;
		this.userData = {};

		migrateObject(this, obj, this);

		if (!obj.hasOwnProperty('userData')) {
			migrateObject(this.userData, obj, this.userData);
		}

		this.type = this.getMediaType();
	}

	getTags(): string[] {
		return ['wiki'];
	}

	getMediaType(): MediaType {
		return MediaType.Wiki;
	}

	override getWithOutUserData(): object {
		const copy = Object.assign({}, this);
		delete copy.userData;
		delete copy.article;
		return copy;
	}

	getSummary(): string {
		return this.title;
	}
}
