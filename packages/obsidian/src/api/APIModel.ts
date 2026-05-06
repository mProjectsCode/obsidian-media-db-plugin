import type MediaDbPlugin from 'packages/obsidian/src/main';
import type { MediaTypeModel } from 'packages/obsidian/src/models/MediaTypeModel';
import type { MDBError } from 'packages/obsidian/src/utils/MDBError';
import type { MediaType } from 'packages/obsidian/src/utils/MediaType';
import type { Result } from 'packages/obsidian/src/utils/result';

export abstract class APIModel {
	apiName!: string;
	apiUrl!: string;
	apiDescription!: string;
	types!: MediaType[];
	plugin!: MediaDbPlugin;

	/**
	 * This function should query the api and return a list of matches. The matches should be capped at 20.
	 *
	 * @param title the title to query for
	 */
	abstract searchByTitle(title: string): Promise<Result<MediaTypeModel[], MDBError>>;

	abstract getById(id: string): Promise<Result<MediaTypeModel, MDBError>>;

	abstract getDisabledMediaTypes(): MediaType[];

	hasType(type: MediaType): boolean {
		const disabledMediaTypes = this.getDisabledMediaTypes();
		return this.types.includes(type) && !disabledMediaTypes.includes(type);
	}

	hasTypeOverlap(types: MediaType[]): boolean {
		return types.some(type => this.hasType(type));
	}
}
