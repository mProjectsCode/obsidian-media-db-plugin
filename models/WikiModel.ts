import { MediaType } from '../utils/MediaType';
import type { ModelToData } from '../utils/Utils';
import { mediaDbTag, migrateObject } from '../utils/Utils';
import { MediaTypeModel } from './MediaTypeModel';

export type WikiData = ModelToData<WikiModel>;

export class WikiModel extends MediaTypeModel {
	wikiUrl: string;
	lastUpdated: string;
	length: number;
	article: string;

	userData: Record<string, unknown>;

	constructor(obj: WikiData) {
		super();

		this.wikiUrl = '';
		this.lastUpdated = '';
		this.length = 0;
		this.article = '';
		this.userData = {};

		migrateObject(this, obj, this);

		if (!Object.hasOwn(obj, 'userData')) {
			migrateObject(this.userData, obj, this.userData);
		}

		this.type = this.getMediaType();
	}

	getTags(): string[] {
		return [mediaDbTag, 'wiki'];
	}

	getMediaType(): MediaType {
		return MediaType.Wiki;
	}

	override getWithOutUserData(): Record<string, unknown> {
		const copy = structuredClone(this) as Record<string, unknown>;
		delete copy.userData;
		delete copy.article;
		return copy;
	}

	getSummary(): string {
		return this.title;
	}
}
