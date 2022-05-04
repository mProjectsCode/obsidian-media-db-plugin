import {APIRequestResult} from './APIRequestResult';

export abstract class APIModel {
	name: string;
	types: string[];

	/**
	 * This function should query the api and return a list of matches. The matches should be caped at 20.
	 *
	 * @param title the title to query for
	 */
	abstract getByTitle(title: string): Promise<APIRequestResult[]>;

	/**
	 * This function should return the metadata corresponding to the api result. An implementation should check first, if the result is from this api.
	 *
	 * @param item
	 */
	abstract getMataDataFromResult(item: APIRequestResult): string;

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
