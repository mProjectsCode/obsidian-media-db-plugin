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
		const base = { ...this.getWithOutUserData() };

		// Extract description-like fields to pin them just before tags
		const hasSummary = Object.hasOwn(base, 'summary');
		const hasPlot = Object.hasOwn(base, 'plot');
		const summary = base.summary;
		const plot = base.plot;
		delete base.summary;
		delete base.plot;

		const obj: Record<string, unknown> = { ...base, ...this.userData };

		// year: 0 means "unknown" — write null so YAML shows blank (None) instead of 0
		if (obj.year === 0) obj.year = null;

		// Pin summary / plot just above tags — always include them if the model has the field
		// (empty string → null so YAML renders as blank rather than empty quotes)
		if (hasSummary) obj.summary = summary || null;
		if (hasPlot) obj.plot = plot || null;

		obj.tags = this.getTags().join('/');
		return obj;
	}

	getWithOutUserData(): Record<string, unknown> {
		const copy = structuredClone(this) as Record<string, unknown>;
		delete copy.userData;
		return copy;
	}
}
