import { MediaType } from '../utils/MediaType';

export abstract class MediaTypeModel {
	type: string;
	subType: string;
	title: string;
	englishTitle: string;
	year: string;
	dataSource: string;
	url: string;
	id: string;

	userData: object;

	protected constructor() {
		this.type = undefined;
		this.subType = undefined;
		this.title = undefined;
		this.englishTitle = undefined;
		this.year = undefined;
		this.dataSource = undefined;
		this.url = undefined;
		this.id = undefined;
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
