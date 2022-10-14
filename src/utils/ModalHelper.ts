import {MediaDbAdvancedSearchModal} from '../modals/MediaDbAdvancedSearchModal';
import {MediaDbIdSearchModal} from '../modals/MediaDbIdSearchModal';
import {MediaTypeModel} from '../models/MediaTypeModel';
import {MediaDbSearchResultModal} from '../modals/MediaDbSearchResultModal';
import {Notice} from 'obsidian';
import MediaDbPlugin from '../main';
import {MediaDbPreviewModal} from 'src/modals/MediaDbPreviewModal';
import {CreateNoteOptions} from './Utils';


export enum ModalResultCode {
	SUCCESS,
	SKIP,
	CLOSE,
	ERROR,
}

/**
 * Object containing the data {@link ModalHelper.createAdvancedSearchModal} returns.
 * On {@link ModalResultCode.SUCCESS} this contains {@link AdvancedSearchModalData}.
 * On {@link ModalResultCode.ERROR} this contains a reference to that error.
 */
export interface AdvancedSearchModalResult {
	code: ModalResultCode.SUCCESS | ModalResultCode.CLOSE | ModalResultCode.ERROR,
	data?: AdvancedSearchModalData,
	error?: Error,
}

/**
 * Object containing the data {@link ModalHelper.createIdSearchModal} returns.
 * On {@link ModalResultCode.SUCCESS} this contains {@link IdSearchModalData}.
 * On {@link ModalResultCode.ERROR} this contains a reference to that error.
 */
export interface IdSearchModalResult {
	code: ModalResultCode.SUCCESS | ModalResultCode.CLOSE | ModalResultCode.ERROR,
	data?: IdSearchModalData,
	error?: Error,
}

/**
 * Object containing the data {@link ModalHelper.createSelectModal} returns.
 * On {@link ModalResultCode.SUCCESS} this contains {@link SelectModalData}.
 * On {@link ModalResultCode.ERROR} this contains a reference to that error.
 */
export interface SelectModalResult {
	code: ModalResultCode.SUCCESS | ModalResultCode.CLOSE | ModalResultCode.SKIP | ModalResultCode.ERROR,
	data?: SelectModalData,
	error?: Error,
}

/**
 * Object containing the data {@link ModalHelper.createPreviewModal} returns.
 * On {@link ModalResultCode.SUCCESS} this contains {@link PreviewModalData}.
 * On {@link ModalResultCode.ERROR} this contains a reference to that error.
 */
export interface PreviewModalResult {
	code: ModalResultCode.SUCCESS | ModalResultCode.CLOSE | ModalResultCode.ERROR,
	data?: PreviewModalData,
	error?: Error,
}

/**
 * The data the advanced search modal returns.
 * - query: the query string
 * - apis: the selected APIs
 */
export interface AdvancedSearchModalData {
	query: string,
	apis: string[],
}

/**
 * The data the id search modal returns.
 * - query: the query string
 * - apis: the selected APIs
 */
export interface IdSearchModalData {
	query: string,
	api: string,
}

/**
 * The data the select modal returns.
 * - selected: the selected items
 */
export interface SelectModalData {
	selected: MediaTypeModel[],
}

/**
 * The data the preview modal returns.
 * - confirmed: whether the selected element has been confirmed
 */
export interface PreviewModalData {
	confirmed: boolean,
}

/**
 * Options for the advanced search modal.
 * - modalTitle: the title of the modal
 * - preselectedAPIs: a list of preselected APIs
 * - prefilledSearchString: prefilled query
 */
export interface AdvancedSearchModalOptions {
	modalTitle?: string,
	preselectedAPIs?: string[],
	prefilledSearchString?: string,
}

/**
 * Options for the id search modal.
 * - modalTitle: the title of the modal
 * - preselectedAPIs: a list of preselected APIs
 * - prefilledSearchString: prefilled query
 */
export interface IdSearchModalOptions {
	modalTitle?: string,
	preselectedAPI?: string,
	prefilledSearchString?: string,
}

/**
 * Options for the select modal.
 * - modalTitle: the title of the modal
 * - elements: the elements the user can select from
 * - multiSelect: whether to allow multiselect
 * - skipButton: whether to add a skip button to the modal
 */
export interface SelectModalOptions {
	modalTitle?: string,
	elements?: MediaTypeModel[],
	multiSelect?: boolean,
	skipButton?: boolean,
}

/**
 * Options for the preview modal.
 * - modalTitle: the title of the modal
 * - elements: the elements to preview
 */
export interface PreviewModalOptions {
	modalTitle?: string,
	elements?: MediaTypeModel[],
	createNoteOptions?: CreateNoteOptions,
}

export const ADVANCED_SEARCH_MODAL_DEFAULT_OPTIONS: AdvancedSearchModalOptions = {
	modalTitle: 'Media DB Advanced Search',
	preselectedAPIs: [],
	prefilledSearchString: '',
};

export const ID_SEARCH_MODAL_DEFAULT_OPTIONS: IdSearchModalOptions = {
	modalTitle: 'Media DB Id Search',
	preselectedAPI: '',
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
	createNoteOptions: {attachTemplate: true},
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
	 * Creates an {@link MediaDbAdvancedSearchModal}, then sets callbacks and awaits them,
	 * returning either the user input once submitted or nothing once closed.
	 * The modal needs ot be manually closed by calling `close()` on the modal reference.
	 *
	 * @param advancedSearchModalOptions the options for the modal, see {@link ADVANCED_SEARCH_MODAL_DEFAULT_OPTIONS}
	 * @returns the user input or nothing and a reference to the modal.
	 */
	async createAdvancedSearchModal(advancedSearchModalOptions: AdvancedSearchModalOptions): Promise<{ advancedSearchModalResult: AdvancedSearchModalResult, advancedSearchModal: MediaDbAdvancedSearchModal }> {
		const modal = new MediaDbAdvancedSearchModal(this.plugin, advancedSearchModalOptions);
		const res: AdvancedSearchModalResult = await new Promise((resolve, reject) => {
			modal.setSubmitCallback(res => resolve({code: ModalResultCode.SUCCESS, data: res}));
			modal.setCloseCallback(err => {
				if (err) {
					resolve({code: ModalResultCode.ERROR, error: err});
				}
				resolve({code: ModalResultCode.CLOSE});
			});

			modal.open();
		});
		return {advancedSearchModalResult: res, advancedSearchModal: modal};
	}

	/**
	 * Opens an {@link MediaDbAdvancedSearchModal} and awaits its result,
	 * then executes the `submitCallback` returning the callbacks result and closing the modal.
	 *
	 * @param advancedSearchModalOptions the options for the modal, see {@link ADVANCED_SEARCH_MODAL_DEFAULT_OPTIONS}
	 * @param submitCallback the callback that gets executed after the modal has been submitted, but after it has been closed
	 * @returns the user input or nothing and a reference to the modal.
	 */
	async openAdvancedSearchModal(advancedSearchModalOptions: AdvancedSearchModalOptions, submitCallback: (advancedSearchModalData: AdvancedSearchModalData) => Promise<MediaTypeModel[]>): Promise<MediaTypeModel[]> {
		const {advancedSearchModalResult, advancedSearchModal} = await this.createAdvancedSearchModal(advancedSearchModalOptions);

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
			let callbackRes: MediaTypeModel[];
			callbackRes = await submitCallback(advancedSearchModalResult.data);
			advancedSearchModal.close();
			return callbackRes;
		} catch (e) {
			console.warn(e);
			new Notice(e.toString());
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
	async createIdSearchModal(idSearchModalOptions: IdSearchModalOptions): Promise<{ idSearchModalResult: IdSearchModalResult, idSearchModal: MediaDbIdSearchModal }> {
		const modal = new MediaDbIdSearchModal(this.plugin, idSearchModalOptions);
		const res: IdSearchModalResult = await new Promise((resolve, reject) => {
			modal.setSubmitCallback(res => resolve({code: ModalResultCode.SUCCESS, data: res}));
			modal.setCloseCallback(err => {
				if (err) {
					resolve({code: ModalResultCode.ERROR, error: err});
				}
				resolve({code: ModalResultCode.CLOSE});
			});

			modal.open();
		});
		return {idSearchModalResult: res, idSearchModal: modal};
	}

	/**
	 * Opens an {@link MediaDbIdSearchModal} and awaits its result,
	 * then executes the `submitCallback` returning the callbacks result and closing the modal.
	 *
	 * @param idSearchModalOptions the options for the modal, see {@link ID_SEARCH_MODAL_DEFAULT_OPTIONS}
	 * @param submitCallback the callback that gets executed after the modal has been submitted, but after it has been closed
	 * @returns the user input or nothing and a reference to the modal.
	 */
	async openIdSearchModal(idSearchModalOptions: IdSearchModalOptions, submitCallback: (idSearchModalData: IdSearchModalData) => Promise<MediaTypeModel>): Promise<MediaTypeModel> {
		const {idSearchModalResult, idSearchModal} = await this.createIdSearchModal(idSearchModalOptions);

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
			let callbackRes: MediaTypeModel;
			callbackRes = await submitCallback(idSearchModalResult.data);
			idSearchModal.close();
			return callbackRes;
		} catch (e) {
			console.warn(e);
			new Notice(e.toString());
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
	async createSelectModal(selectModalOptions: SelectModalOptions): Promise<{ selectModalResult: SelectModalResult, selectModal: MediaDbSearchResultModal }> {
		const modal = new MediaDbSearchResultModal(this.plugin, selectModalOptions);
		const res: SelectModalResult = await new Promise((resolve, reject) => {
			modal.setSubmitCallback(res => resolve({code: ModalResultCode.SUCCESS, data: res}));
			modal.setSkipCallback(() => resolve({code: ModalResultCode.SKIP}));
			modal.setCloseCallback(err => {
				if (err) {
					resolve({code: ModalResultCode.ERROR, error: err});
				}
				resolve({code: ModalResultCode.CLOSE});
			});

			modal.open();
		});
		return {selectModalResult: res, selectModal: modal};
	}

	/**
	 * Opens an {@link MediaDbSearchResultModal} and awaits its result,
	 * then executes the `submitCallback` returning the callbacks result and closing the modal.
	 *
	 * @param selectModalOptions the options for the modal, see {@link SELECT_MODAL_OPTIONS_DEFAULT}
	 * @param submitCallback the callback that gets executed after the modal has been submitted, but after it has been closed
	 * @returns the user input or nothing and a reference to the modal.
	 */
	async openSelectModal(selectModalOptions: SelectModalOptions, submitCallback: (selectModalData: SelectModalData) => Promise<MediaTypeModel[]>): Promise<MediaTypeModel[]> {
		const {selectModalResult, selectModal} = await this.createSelectModal(selectModalOptions);

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
			let callbackRes: MediaTypeModel[];
			callbackRes = await submitCallback(selectModalResult.data);
			selectModal.close();
			return callbackRes;
		} catch (e) {
			console.warn(e);
			new Notice(e.toString());
			selectModal.close();
			return;
		}
	}

	async createPreviewModal(previewModalOptions: PreviewModalOptions): Promise<{ previewModalResult: PreviewModalResult, previewModal: MediaDbPreviewModal }> {
		//todo: handle attachFile for existing files
		const modal = new MediaDbPreviewModal(this.plugin, previewModalOptions);
		const res: PreviewModalResult = await new Promise((resolve, reject) => {
			modal.setSubmitCallback(res => resolve({code: ModalResultCode.SUCCESS, data: res}));
			modal.setCloseCallback(err => {
				if (err) {
					resolve({code: ModalResultCode.ERROR, error: err});
				}
				resolve({code: ModalResultCode.CLOSE});
			});

			modal.open();
		});
		return {previewModalResult: res, previewModal: modal};
	}

	async openPreviewModal(previewModalOptions: PreviewModalOptions, submitCallback: (previewModalData: PreviewModalData) => Promise<boolean>): Promise<boolean> {
		const {previewModalResult, previewModal} = await this.createPreviewModal(previewModalOptions);

		if (previewModalResult.code === ModalResultCode.ERROR) {
			// there was an error in the modal itself
			console.warn(previewModalResult.error);
			new Notice(previewModalResult.error.toString());
			previewModal.close();
			return undefined;
		}

		if (previewModalResult.code === ModalResultCode.CLOSE) {
			// modal is already being closed
			return undefined;
		}

		try {
			let callbackRes: boolean;
			callbackRes = await submitCallback(previewModalResult.data);
			previewModal.close();
			return callbackRes;
		} catch (e) {
			console.warn(e);
			new Notice(e.toString());
			previewModal.close();
			return;
		}
	}
}

