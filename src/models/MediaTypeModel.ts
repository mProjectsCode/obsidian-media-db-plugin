import type { MediaType } from '../utils/MediaType';

export abstract class MediaTypeModel {
	type: string;
	subType: string;
	title: string;
	englishTitle: string;
	year: string;
	dataSource: string;
	url: string;
	id: string;
	image?: string;

	userData: object;

	protected constructor() {
		this.type = '';
		this.subType = '';
		this.title = '';
		this.englishTitle = '';
		this.year = '';
		this.dataSource = '';
		this.url = '';
		this.id = '';
		this.image = '';

		this.userData = {};
	}

	abstract getMediaType(): MediaType;

	//a string that contains enough info to disambiguate from similar media
	abstract getSummary(): string;

	abstract getTags(): string[];

	toMetaDataObject(): Record<string, unknown> {
		return { ...this.getWithOutUserData(), ...this.userData, tags: this.getTags().join('/') };
	}

	getWithOutUserData(): Record<string, unknown> {
		const copy = structuredClone(this) as Record<string, unknown>;
		delete copy.userData;
		return copy;
	}
}
