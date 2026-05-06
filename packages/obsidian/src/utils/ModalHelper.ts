import type MediaDbPlugin from 'packages/obsidian/src/main';
import { MediaDbAdvancedSearchModal } from 'packages/obsidian/src/modals/MediaDbAdvancedSearchModal';
import { MediaDbIdSearchModal } from 'packages/obsidian/src/modals/MediaDbIdSearchModal';
import { MediaDbPreviewModal } from 'packages/obsidian/src/modals/MediaDbPreviewModal';
import { MediaDbSearchModal } from 'packages/obsidian/src/modals/MediaDbSearchModal';
import { MediaDbSearchResultModal } from 'packages/obsidian/src/modals/MediaDbSearchResultModal';
import type { MediaTypeModel } from 'packages/obsidian/src/models/MediaTypeModel';
import type { AppError } from 'packages/obsidian/src/utils/AppError';
import { AppErrorKind, toAppError } from 'packages/obsidian/src/utils/AppError';
import type { MediaType } from 'packages/obsidian/src/utils/MediaType';
import type { Outcome } from 'packages/obsidian/src/utils/result';
import { cancelled, failure, OutcomeStatus, skipped, success } from 'packages/obsidian/src/utils/result';

export interface SearchModalData {
	query: string;
	types: MediaType[];
}

export interface AdvancedSearchModalData {
	query: string;
	apis: string[];
}

export interface IdSearchModalData {
	query: string;
	api: string;
}

export interface SelectModalData {
	selected: MediaTypeModel[];
}

export interface PreviewModalData {
	confirmed: boolean;
}

export interface SearchModalOptions {
	modalTitle?: string;
	preselectedTypes?: MediaType[];
	prefilledSearchString?: string;
}

export interface AdvancedSearchModalOptions {
	modalTitle?: string;
	preselectedAPIs?: string[];
	prefilledSearchString?: string;
}

export interface IdSearchModalOptions {
	modalTitle?: string;
	preselectedAPI?: string;
	prefilledSearchString?: string;
}

export interface SelectModalOptions {
	elements?: MediaTypeModel[];
	multiSelect?: boolean;
	modalTitle?: string;
	skipButton?: boolean;
	description?: string;
	submitButtonText?: string;
}

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

interface ModalCoreResult<T, TModal> {
	modalResult: Outcome<T, AppError>;
	modal: TModal;
}

export class ModalHelper {
	plugin: MediaDbPlugin;

	constructor(plugin: MediaDbPlugin) {
		this.plugin = plugin;
	}

	private async openModalCore<TData, TModal extends { open(): void; close(): void }>(
		createModal: () => TModal,
		wireHandlers: (modal: TModal, resolve: (result: Outcome<TData, AppError>) => void) => void,
	): Promise<ModalCoreResult<TData, TModal>> {
		const modal = createModal();
		const modalResult = await new Promise<Outcome<TData, AppError>>(resolve => {
			wireHandlers(modal, resolve);
			modal.open();
		});

		return { modalResult, modal };
	}

	private async resolveOutcome<T>(outcomePromise: Promise<Outcome<T, AppError>>): Promise<T | undefined> {
		const outcome = await outcomePromise;

		if (outcome.status === OutcomeStatus.Ok) {
			return outcome.data;
		}

		if (outcome.status === OutcomeStatus.Error) {
			this.plugin.errorReporter.report(outcome.error);
		}

		return undefined;
	}

	async createSearchModalOutcome(searchModalOptions: SearchModalOptions): Promise<Outcome<SearchModalData, AppError>> {
		const { modalResult, modal } = await this.openModalCore<SearchModalData, MediaDbSearchModal>(
			() => new MediaDbSearchModal(this.plugin, searchModalOptions),
			(modal, resolve) => {
				modal.setSubmitCb(res => resolve(success(res)));
				modal.setCloseCb(err => {
					if (err) {
						resolve(failure(toAppError(err, { kind: AppErrorKind.Modal, message: 'Search modal closed with an error' })));
						return;
					}

					resolve(cancelled());
				});
			},
		);

		if (modalResult.status === OutcomeStatus.Ok) {
			modal.close();
		}

		return modalResult;
	}

	async promptSearchModal(searchModalOptions: SearchModalOptions): Promise<SearchModalData | undefined> {
		return await this.resolveOutcome(this.createSearchModalOutcome(searchModalOptions));
	}

	async createAdvancedSearchModalOutcome(advancedSearchModalOptions: AdvancedSearchModalOptions): Promise<Outcome<AdvancedSearchModalData, AppError>> {
		const { modalResult, modal } = await this.openModalCore<AdvancedSearchModalData, MediaDbAdvancedSearchModal>(
			() => new MediaDbAdvancedSearchModal(this.plugin, advancedSearchModalOptions),
			(modal, resolve) => {
				modal.setSubmitCb(res => resolve(success(res)));
				modal.setCloseCb(err => {
					if (err) {
						resolve(failure(toAppError(err, { kind: AppErrorKind.Modal, message: 'Advanced search modal closed with an error' })));
						return;
					}

					resolve(cancelled());
				});
			},
		);

		if (modalResult.status === OutcomeStatus.Ok) {
			modal.close();
		}

		return modalResult;
	}

	async promptAdvancedSearchModal(advancedSearchModalOptions: AdvancedSearchModalOptions): Promise<AdvancedSearchModalData | undefined> {
		return await this.resolveOutcome(this.createAdvancedSearchModalOutcome(advancedSearchModalOptions));
	}

	async createIdSearchModalOutcome(idSearchModalOptions: IdSearchModalOptions): Promise<Outcome<IdSearchModalData, AppError>> {
		const { modalResult, modal } = await this.openModalCore<IdSearchModalData, MediaDbIdSearchModal>(
			() => new MediaDbIdSearchModal(this.plugin, idSearchModalOptions),
			(modal, resolve) => {
				modal.setSubmitCb(res => resolve(success(res)));
				modal.setCloseCb(err => {
					if (err) {
						resolve(failure(toAppError(err, { kind: AppErrorKind.Modal, message: 'Id search modal closed with an error' })));
						return;
					}

					resolve(cancelled());
				});
			},
		);

		if (modalResult.status === OutcomeStatus.Ok) {
			modal.close();
		}

		return modalResult;
	}

	async promptIdSearchModal(idSearchModalOptions: IdSearchModalOptions): Promise<IdSearchModalData | undefined> {
		return await this.resolveOutcome(this.createIdSearchModalOutcome(idSearchModalOptions));
	}

	async createSelectModalOutcome(selectModalOptions: SelectModalOptions): Promise<Outcome<SelectModalData, AppError>> {
		const { modalResult, modal } = await this.openModalCore<SelectModalData, MediaDbSearchResultModal>(
			() => new MediaDbSearchResultModal(this.plugin, selectModalOptions),
			(modal, resolve) => {
				modal.setSubmitCb(res => resolve(success(res)));
				modal.setSkipCallback(() => resolve(skipped()));
				modal.setCloseCb(err => {
					if (err) {
						resolve(failure(toAppError(err, { kind: AppErrorKind.Modal, message: 'Select modal closed with an error' })));
						return;
					}

					resolve(cancelled());
				});
			},
		);

		if (modalResult.status === OutcomeStatus.Ok || modalResult.status === OutcomeStatus.Skipped) {
			modal.close();
		}

		return modalResult;
	}

	async promptSelectModal(selectModalOptions: SelectModalOptions): Promise<SelectModalData | undefined> {
		return await this.resolveOutcome(this.createSelectModalOutcome(selectModalOptions));
	}

	async createPreviewModalOutcome(previewModalOptions: PreviewModalOptions): Promise<Outcome<PreviewModalData, AppError>> {
		const { modalResult, modal } = await this.openModalCore<PreviewModalData, MediaDbPreviewModal>(
			() => new MediaDbPreviewModal(this.plugin, previewModalOptions),
			(modal, resolve) => {
				modal.setSubmitCb(res => resolve(success(res)));
				modal.setCloseCb(err => {
					if (err) {
						resolve(failure(toAppError(err, { kind: AppErrorKind.Modal, message: 'Preview modal closed with an error' })));
						return;
					}

					resolve(cancelled());
				});
			},
		);

		if (modalResult.status === OutcomeStatus.Ok) {
			modal.close();
		}

		return modalResult;
	}

	async promptPreviewModal(previewModalOptions: PreviewModalOptions): Promise<PreviewModalData | undefined> {
		return await this.resolveOutcome(this.createPreviewModalOutcome(previewModalOptions));
	}
}
