import type { MediaType } from '../utils/MediaType';

export abstract class MediaTypeModel {
	type: string;
	subType: string;
	title: string;
	englishTitle: string;
	year: number;
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
		this.year = 0;
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
		const obj: Record<string, unknown> = { ...this.getWithOutUserData(), ...this.userData, tags: this.getTags().join('/') };
		// year: 0 means "unknown" — write null so YAML shows blank (None) instead of 0
		if (obj['year'] === 0) obj['year'] = null;
		return obj;
	}

	getWithOutUserData(): Record<string, unknown> {
		const copy = structuredClone(this) as Record<string, unknown>;
		delete copy.userData;
		return copy;
	}
}
