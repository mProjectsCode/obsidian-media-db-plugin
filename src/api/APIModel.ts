import {MediaTypeModel} from '../models/MediaTypeModel';

export abstract class APIModel {
	apiName: string;
	apiUrl: string;
	types: string[];

	/**
	 * This function should query the api and return a list of matches. The matches should be caped at 20.
	 *
	 * @param title the title to query for
	 */
	abstract getByTitle(title: string): Promise<MediaTypeModel[]>;

	hasType(type: string): boolean {
		return this.types.contains(type);
	}

	hasTypeOverlap(types: string[]): boolean {
		for (const type of types) {
			if (this.hasType(type)) {
				return true;
			}
		}
		return false;
	}
}
