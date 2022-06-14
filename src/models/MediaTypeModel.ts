import {MediaType} from '../utils/MediaType';

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

	abstract getMediaType(): MediaType;

	abstract getTags(): string[];

	toMetaDataObject(): object {
		return {...this.getWithOutUserData(), ...this.userData, tags: '#' + this.getTags().join('/')};
	}

	getWithOutUserData(): object {
		const copy = JSON.parse(JSON.stringify(this));
		delete copy.userData;
		return copy;
	}

}
