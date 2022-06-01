import {MediaTypeModel} from './MediaTypeModel';
import {mediaDbTag} from '../utils/Utils';
import {MediaType} from '../utils/MediaType';


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

	userData: {};

	constructor(obj: any = {}) {
		super();

		Object.assign(this, obj);

		this.type = this.getMediaType();
	}

	getTags(): string[] {
		return [mediaDbTag, 'wiki'];
	}

	getMediaType(): MediaType {
		return MediaType.Wiki;
	}

}
