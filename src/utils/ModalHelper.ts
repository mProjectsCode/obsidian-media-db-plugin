import { Notice } from 'obsidian';
import { MediaDbPreviewModal } from 'src/modals/MediaDbPreviewModal';
import type MediaDbPlugin from '../main';
import { MediaDbAdvancedSearchModal } from '../modals/MediaDbAdvancedSearchModal';
import { MediaDbIdSearchModal } from '../modals/MediaDbIdSearchModal';
import { MediaDbSearchModal } from '../modals/MediaDbSearchModal';
import { MediaDbSearchResultModal } from '../modals/MediaDbSearchResultModal';
import type { MediaTypeModel } from '../models/MediaTypeModel';
import type { MediaType } from './MediaType';

export enum ModalResultCode {
	SUCCESS = 'SUCCESS',
	SKIP = 'SKIP',
	CLOSE = 'CLOSE',
	ERROR = 'ERROR',
}

type ModalResult<T> =
	| {
			code: ModalResultCode.CLOSE;
	  }
	| {
			code: ModalResultCode.ERROR;
			error: Error;
	  }
	| {
			code: ModalResultCode.SUCCESS;
			data: T;
	  };

type SkippableModalResult<T> =
	| ModalResult<T>
	| {
			code: ModalResultCode.SKIP;
	  };

/**
 * Object containing the data {@link ModalHelper.createSearchModal} returns.
 * On {@link ModalResultCode.SUCCESS} this contains {@link SearchModalData}.
 * On {@link ModalResultCode.ERROR} this contains a reference to that error.
 */
export type SearchModalResult = ModalResult<SearchModalData>;

/**
 * Object containing the data {@link ModalHelper.createAdvancedSearchModal} returns.
 * On {@link ModalResultCode.SUCCESS} this contains {@link AdvancedSearchModalData}.
 * On {@link ModalResultCode.ERROR} this contains a reference to that error.
 */
export type AdvancedSearchModalResult = ModalResult<AdvancedSearchModalData>;

/**
 * Object containing the data {@link ModalHelper.createIdSearchModal} returns.
 * On {@link ModalResultCode.SUCCESS} this contains {@link IdSearchModalData}.
 * On {@link ModalResultCode.ERROR} this contains a reference to that error.
 */
export type IdSearchModalResult = ModalResult<IdSearchModalData>;

/**
 * Object containing the data {@link ModalHelper.createSelectModal} returns.
 * On {@link ModalResultCode.SUCCESS} this contains {@link SelectModalData}.
 * On {@link ModalResultCode.ERROR} this contains a reference to that error.
 */
export type SelectModalResult = SkippableModalResult<SelectModalData>;

/**
 * Object containing the data {@link ModalHelper.createPreviewModal} returns.
 * On {@link ModalResultCode.SUCCESS} this contains {@link PreviewModalData}.
 * On {@link ModalResultCode.ERROR} this contains a reference to that error.
 */
export type PreviewModalResult = ModalResult<PreviewModalData>;

/**
 * The data the search modal returns.
 * - query: the query string
 * - types: the selected APIs
 */
export interface SearchModalData {
	query: string;
	types: MediaType[];
}

/**
 * The data the advanced search modal returns.
 * - query: the query string
 * - apis: the selected APIs
 */
export interface AdvancedSearchModalData {
	query: string;
	apis: string[];
}

/**
 * The data the id search modal returns.
 * - query: the query string
 * - apis: the selected APIs
 */
export interface IdSearchModalData {
	query: string;
	api: string;
}

/**
 * The data the select modal returns.
 * - selected: the selected items
 */
export interface SelectModalData {
	selected: MediaTypeModel[];
}

/**
 * The data the preview modal returns.
 * - confirmed: whether the selected element has been confirmed
 */
export interface PreviewModalData {
	confirmed: boolean;
}

/**
 * Options for the search modal.
 * - modalTitle: the title of the modal
 * - preselectedTypes: a list of preselected Types
 * - prefilledSearchString: prefilled query
 */
export interface SearchModalOptions {
	modalTitle?: string;
	preselectedTypes?: MediaType[];
	prefilledSearchString?: string;
}

/**
 * Options for the advanced search modal.
 * - modalTitle: the title of the modal
 * - preselectedAPIs: a list of preselected APIs
 * - prefilledSearchString: prefilled query
 */
export interface AdvancedSearchModalOptions {
	modalTitle?: string;
	preselectedAPIs?: string[];
	prefilledSearchString?: string;
}

/**
 * Options for the id search modal.
 * - modalTitle: the title of the modal
 * - preselectedAPIs: a list of preselected APIs
 * - prefilledSearchString: prefilled query
 */
export interface IdSearchModalOptions {
	modalTitle?: string;
	preselectedAPI?: string;
	prefilledSearchString?: string;
}

/**
 * Options for the select modal.
 * - modalTitle: the title of the modal
 * - elements: the elements the user can select from
 * - multiSelect: whether to allow multiselect
 * - skipButton: whether to add a skip button to the modal
 */
export interface SelectModalOptions {
	elements?: MediaTypeModel[];
	multiSelect?: boolean;
	modalTitle?: string;
	skipButton?: boolean;
	description?: string; // Add this
	submitButtonText?: string; // Add this too
}
/**
 * Options for the preview modal.
 * - modalTitle: the title of the modal
 * - elements: the elements to preview
 */
export interface PreviewModalOptions {
	modalTitle?: string;
	elements?: MediaTypeModel[];
}

export const SEARCH_MODAL_DEFAULT_OPTIONS: SearchModalOptions = {
	modalTitle: 'Media DB Search',
	preselectedTypes: [],
	prefilledSearchString: '',
};

export const ADVANCED_SEARCH_MODAL_DEFAULT_OPTIONS: AdvancedSearchModalOptions = {
	modalTitle: 'Media DB Advanced Search',
	preselectedAPIs: [],
	prefilledSearchString: '',
};

export const ID_SEARCH_MODAL_DEFAULT_OPTIONS: IdSearchModalOptions = {
	modalTitle: 'Media DB Id Search',
	preselectedAPI: undefined,
	prefilledSearchString: '',
};

export const SELECT_MODAL_OPTIONS_DEFAULT: SelectModalOptions = {
	modalTitle: 'Media DB Search Results',
	elements: [],
	multiSelect: true,
	skipButton: false,
};

export const PREVIEW_MODAL_DEFAULT_OPTIONS: PreviewModalOptions = {
	modalTitle: 'Media DB Preview',
	elements: [],
};

export const SELECTMODALOPTIONSDEFAULT: SelectModalOptions = {
	elements: [],
	multiSelect: true,
	modalTitle: '',
	skipButton: false,
	description: 'Select one or multiple search results.',
	submitButtonText: 'Ok',
};

/**
 * A class providing multiple usefull functions for dealing with the plugins modals.
 */
export class ModalHelper {
	plugin: MediaDbPlugin;

	constructor(plugin: MediaDbPlugin) {
		this.plugin = plugin;
	}

	/**
	 * Creates an {@link MediaDbSearchModal}, then sets callbacks and awaits them,
	 * returning either the user input once submitted or nothing once closed.
	 * The modal needs ot be manually closed by calling `close()` on the modal reference.
	 *
	 * @param searchModalOptions the options for the modal, see {@link SEARCH_MODAL_DEFAULT_OPTIONS}
	 * @returns the user input or nothing and a reference to the modal.
	 */
	async createSearchModal(searchModalOptions: SearchModalOptions): Promise<{ searchModalResult: SearchModalResult; searchModal: MediaDbSearchModal }> {
		const modal = new MediaDbSearchModal(this.plugin, searchModalOptions);
		const res: SearchModalResult = await new Promise(resolve => {
			modal.setSubmitCb(res => resolve({ code: ModalResultCode.SUCCESS, data: res }));
			modal.setCloseCb(err => {
				if (err) {
					resolve({ code: ModalResultCode.ERROR, error: err });
				}
				resolve({ code: ModalResultCode.CLOSE });
			});

			modal.open();
		});
		return { searchModalResult: res, searchModal: modal };
	}

	/**
	 * Opens an {@link MediaDbSearchModal} and awaits its result,
	 * then executes the `submitCallback` returning the callbacks result and closing the modal.
	 *
	 * @param searchModalOptions the options for the modal, see {@link SEARCH_MODAL_DEFAULT_OPTIONS}
	 * @param submitCallback the callback that gets executed after the modal has been submitted, but after it has been closed
	 * @returns the user input or nothing and a reference to the modal.
	 */
	async openSearchModal(
		searchModalOptions: SearchModalOptions,
		submitCallback: (searchModalData: SearchModalData) => Promise<MediaTypeModel[]>,
	): Promise<MediaTypeModel[] | undefined> {
		const { searchModalResult, searchModal } = await this.createSearchModal(searchModalOptions);
		console.debug(`MDB | searchModal closed with code ${searchModalResult.code}`);

		if (searchModalResult.code === ModalResultCode.ERROR) {
			// there was an error in the modal itself
			console.warn(searchModalResult.error);
			new Notice(searchModalResult.error.toString());
			searchModal.close();
			return undefined;
		}

		if (searchModalResult.code === ModalResultCode.CLOSE) {
			// modal is already being closed
			return undefined;
		}

		try {
			const callbackRes: MediaTypeModel[] = await submitCallback(searchModalResult.data);
			searchModal.close();
			return callbackRes;
		} catch (e) {
			console.warn(e);
			new Notice(`${e}`);
			searchModal.close();
			return undefined;
		}
	}

	/**
	 * Creates an {@link MediaDbAdvancedSearchModal}, then sets callbacks and awaits them,
	 * returning either the user input once submitted or nothing once closed.
	 * The modal needs ot be manually closed by calling `close()` on the modal reference.
	 *
	 * @param advancedSearchModalOptions the options for the modal, see {@link ADVANCED_SEARCH_MODAL_DEFAULT_OPTIONS}
	 * @returns the user input or nothing and a reference to the modal.
	 */
	async createAdvancedSearchModal(
		advancedSearchModalOptions: AdvancedSearchModalOptions,
	): Promise<{ advancedSearchModalResult: AdvancedSearchModalResult; advancedSearchModal: MediaDbAdvancedSearchModal }> {
		const modal = new MediaDbAdvancedSearchModal(this.plugin, advancedSearchModalOptions);
		const res: AdvancedSearchModalResult = await new Promise(resolve => {
			modal.setSubmitCb(res => resolve({ code: ModalResultCode.SUCCESS, data: res }));
			modal.setCloseCb(err => {
				if (err) {
					resolve({ code: ModalResultCode.ERROR, error: err });
				}
				resolve({ code: ModalResultCode.CLOSE });
			});

			modal.open();
		});
		return { advancedSearchModalResult: res, advancedSearchModal: modal };
	}

	/**
	 * Opens an {@link MediaDbAdvancedSearchModal} and awaits its result,
	 * then executes the `submitCallback` returning the callbacks result and closing the modal.
	 *
	 * @param advancedSearchModalOptions the options for the modal, see {@link ADVANCED_SEARCH_MODAL_DEFAULT_OPTIONS}
	 * @param submitCallback the callback that gets executed after the modal has been submitted, but after it has been closed
	 * @returns the user input or nothing and a reference to the modal.
	 */
	async openAdvancedSearchModal(
		advancedSearchModalOptions: AdvancedSearchModalOptions,
		submitCallback: (advancedSearchModalData: AdvancedSearchModalData) => Promise<MediaTypeModel[]>,
	): Promise<MediaTypeModel[] | undefined> {
		const { advancedSearchModalResult, advancedSearchModal } = await this.createAdvancedSearchModal(advancedSearchModalOptions);
		console.debug(`MDB | advencedSearchModal closed with code ${advancedSearchModalResult.code}`);

		if (advancedSearchModalResult.code === ModalResultCode.ERROR) {
			// there was an error in the modal itself
			console.warn(advancedSearchModalResult.error);
			new Notice(advancedSearchModalResult.error.toString());
			advancedSearchModal.close();
			return undefined;
		}

		if (advancedSearchModalResult.code === ModalResultCode.CLOSE) {
			// modal is already being closed
			return undefined;
		}

		try {
			const callbackRes: MediaTypeModel[] = await submitCallback(advancedSearchModalResult.data);
			advancedSearchModal.close();
			return callbackRes;
		} catch (e) {
			console.warn(e);
			new Notice(`${e}`);
			advancedSearchModal.close();
			return undefined;
		}
	}

	/**
	 * Creates an {@link MediaDbIdSearchModal}, then sets callbacks and awaits them,
	 * returning either the user input once submitted or nothing once closed.
	 * The modal needs ot be manually closed by calling `close()` on the modal reference.
	 *
	 * @param idSearchModalOptions the options for the modal, see {@link ID_SEARCH_MODAL_DEFAULT_OPTIONS}
	 * @returns the user input or nothing and a reference to the modal.
	 */
	async createIdSearchModal(idSearchModalOptions: IdSearchModalOptions): Promise<{ idSearchModalResult: IdSearchModalResult; idSearchModal: MediaDbIdSearchModal }> {
		const modal = new MediaDbIdSearchModal(this.plugin, idSearchModalOptions);
		const res: IdSearchModalResult = await new Promise(resolve => {
			modal.setSubmitCb(res => resolve({ code: ModalResultCode.SUCCESS, data: res }));
			modal.setCloseCb(err => {
				if (err) {
					resolve({ code: ModalResultCode.ERROR, error: err });
				}
				resolve({ code: ModalResultCode.CLOSE });
			});

			modal.open();
		});
		return { idSearchModalResult: res, idSearchModal: modal };
	}

	/**
	 * Opens an {@link MediaDbIdSearchModal} and awaits its result,
	 * then executes the `submitCallback` returning the callbacks result and closing the modal.
	 *
	 * @param idSearchModalOptions the options for the modal, see {@link ID_SEARCH_MODAL_DEFAULT_OPTIONS}
	 * @param submitCallback the callback that gets executed after the modal has been submitted, but after it has been closed
	 * @returns the user input or nothing and a reference to the modal.
	 */
	async openIdSearchModal(
		idSearchModalOptions: IdSearchModalOptions,
		submitCallback: (idSearchModalData: IdSearchModalData) => Promise<MediaTypeModel | undefined>,
	): Promise<MediaTypeModel | undefined> {
		const { idSearchModalResult, idSearchModal } = await this.createIdSearchModal(idSearchModalOptions);
		console.debug(`MDB | idSearchModal closed with code ${idSearchModalResult.code}`);

		if (idSearchModalResult.code === ModalResultCode.ERROR) {
			// there was an error in the modal itself
			console.warn(idSearchModalResult.error);
			new Notice(idSearchModalResult.error.toString());
			idSearchModal.close();
			return undefined;
		}

		if (idSearchModalResult.code === ModalResultCode.CLOSE) {
			// modal is already being closed
			return undefined;
		}

		try {
			const callbackRes = await submitCallback(idSearchModalResult.data);
			idSearchModal.close();
			return callbackRes;
		} catch (e) {
			console.warn(e);
			new Notice(`${e}`);
			idSearchModal.close();
			return undefined;
		}
	}

	/**
	 * Creates an {@link MediaDbSearchResultModal}, then sets callbacks and awaits them,
	 * returning either the user input once submitted or nothing once closed.
	 * The modal needs ot be manually closed by calling `close()` on the modal reference.
	 *
	 * @param selectModalOptions the options for the modal, see {@link SELECT_MODAL_OPTIONS_DEFAULT}
	 * @returns the user input or nothing and a reference to the modal.
	 */
	async createSelectModal(selectModalOptions: SelectModalOptions): Promise<{ selectModalResult: SelectModalResult; selectModal: MediaDbSearchResultModal }> {
		const modal = new MediaDbSearchResultModal(this.plugin, selectModalOptions);
		const res: SelectModalResult = await new Promise(resolve => {
			modal.setSubmitCb(res => resolve({ code: ModalResultCode.SUCCESS, data: res }));
			modal.setSkipCallback(() => resolve({ code: ModalResultCode.SKIP }));
			modal.setCloseCb(err => {
				if (err) {
					resolve({ code: ModalResultCode.ERROR, error: err });
				}
				resolve({ code: ModalResultCode.CLOSE });
			});

			modal.open();
		});
		return { selectModalResult: res, selectModal: modal };
	}

	/**
	 * Opens an {@link MediaDbSearchResultModal} and awaits its result,
	 * then executes the `submitCallback` returning the callbacks result and closing the modal.
	 *
	 * @param selectModalOptions the options for the modal, see {@link SELECT_MODAL_OPTIONS_DEFAULT}
	 * @param submitCallback the callback that gets executed after the modal has been submitted, but before it has been closed
	 * @returns the user input or nothing and a reference to the modal.
	 */
	async openSelectModal(
		selectModalOptions: SelectModalOptions,
		submitCallback: (selectModalData: SelectModalData) => Promise<MediaTypeModel[]>,
	): Promise<MediaTypeModel[] | undefined> {
		const { selectModalResult, selectModal } = await this.createSelectModal(selectModalOptions);
		console.debug(`MDB | selectModal closed with code ${selectModalResult.code}`);

		if (selectModalResult.code === ModalResultCode.ERROR) {
			// there was an error in the modal itself
			console.warn(selectModalResult.error);
			new Notice(selectModalResult.error.toString());
			selectModal.close();
			return undefined;
		}

		if (selectModalResult.code === ModalResultCode.CLOSE) {
			// modal is already being closed
			return undefined;
		}

		if (selectModalResult.code === ModalResultCode.SKIP) {
			// selection was skipped
			return undefined;
		}

		try {
			const callbackRes: MediaTypeModel[] = await submitCallback(selectModalResult.data);
			selectModal.close();
			return callbackRes;
		} catch (e) {
			console.warn(e);
			new Notice(`${e}`);
			selectModal.close();
			return;
		}
	}

	async createPreviewModal(previewModalOptions: PreviewModalOptions): Promise<{ previewModalResult: PreviewModalResult; previewModal: MediaDbPreviewModal }> {
		//todo: handle attachFile for existing files
		const modal = new MediaDbPreviewModal(this.plugin, previewModalOptions);
		const res: PreviewModalResult = await new Promise(resolve => {
			modal.setSubmitCb(res => resolve({ code: ModalResultCode.SUCCESS, data: res }));
			modal.setCloseCb(err => {
				if (err) {
					resolve({ code: ModalResultCode.ERROR, error: err });
				}
				resolve({ code: ModalResultCode.CLOSE });
			});

			modal.open();
		});
		return { previewModalResult: res, previewModal: modal };
	}

	async openPreviewModal(previewModalOptions: PreviewModalOptions, submitCallback: (previewModalData: PreviewModalData) => Promise<boolean>): Promise<boolean> {
		const { previewModalResult, previewModal } = await this.createPreviewModal(previewModalOptions);
		console.debug(`MDB | previewModal closed with code ${previewModalResult.code}`);

		if (previewModalResult.code === ModalResultCode.ERROR) {
			// there was an error in the modal itself
			console.warn(previewModalResult.error);
			new Notice(previewModalResult.error.toString());
			previewModal.close();
			return false;
		}

		if (previewModalResult.code === ModalResultCode.CLOSE) {
			// modal is already being closed
			return false;
		}

		try {
			const callbackRes: boolean = await submitCallback(previewModalResult.data);
			previewModal.close();
			return callbackRes;
		} catch (e) {
			console.warn(e);
			new Notice(`${e}`);
			previewModal.close();
			return true;
		}
	}
}
