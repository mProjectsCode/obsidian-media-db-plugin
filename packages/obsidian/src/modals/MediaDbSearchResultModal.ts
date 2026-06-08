import type MediaDbPlugin from 'packages/obsidian/src/main';
import { MediaItemComponent } from 'packages/obsidian/src/modals/MediaItemComponent';
import { SelectModal } from 'packages/obsidian/src/modals/SelectModal';
import type { MediaTypeModel } from 'packages/obsidian/src/models/MediaTypeModel';
import type { SelectModalData, SelectModalOptions } from 'packages/obsidian/src/utils/ModalHelper';
import { SELECTMODALOPTIONSDEFAULT } from 'packages/obsidian/src/utils/ModalHelper';

export class MediaDbSearchResultModal extends SelectModal<MediaTypeModel> {
	plugin: MediaDbPlugin;

	busy: boolean;
	sendCallback: boolean;

	submitCallback?: (res: SelectModalData) => void;
	closeCallback?: (err?: Error) => void;
	skipCallback?: () => void;
	submitButtonText: string;

	private autoFetchIndex: number;
	constructor(plugin: MediaDbPlugin, selectModalOptions: SelectModalOptions) {
		selectModalOptions = Object.assign({}, SELECTMODALOPTIONSDEFAULT, selectModalOptions);
		super(plugin.app, selectModalOptions.elements ?? [], selectModalOptions.multiSelect);
		this.plugin = plugin;
		this.title = selectModalOptions.modalTitle ?? '';
		this.description = selectModalOptions.description ?? 'Select one or multiple search results.';
		this.addSkipButton = selectModalOptions.skipButton ?? false;
		this.submitButtonText = selectModalOptions.submitButtonText ?? 'Ok';
		this.busy = false;
		this.sendCallback = false;
		this.autoFetchIndex = 0;
	}

	setSubmitCb(submitCallback: (res: SelectModalData) => void): void {
		this.submitCallback = submitCallback;
	}

	setCloseCb(closeCallback: (err?: Error) => void): void {
		this.closeCallback = closeCallback;
	}

	setSkipCallback(skipCallback: () => void): void {
		this.skipCallback = skipCallback;
	}

	// Different rate limit delay based on API source, MAL APIs = max 3 per second but that still seems to trigger rate limits, so using 750ms delay
	private getDelayForApi(dataSource: string): number {
		const isMalApi = dataSource === 'MALAPI' || dataSource === 'MALAPIManga';
		return isMalApi ? 750 : 200;
	}

	// Renders each suggestion item.
	renderElement(item: MediaTypeModel, el: HTMLElement): void {
		// Create the media item component
		const mediaComponent = new MediaItemComponent(el, {
			imageUrl: this.getImageUrl(item),
			imageAlt: item.title,
			onImageError: (): void => {
				console.debug('MDB | Image failed to load for', item.id);
			},
			onImageLoad: (): void => {
				console.debug('MDB | Image loaded for', item.id);
			},
			renderContent: (contentEl: HTMLElement): void => {
				const titleEl = contentEl.createEl('div', {
					text: this.plugin.mediaTypeManager.getFileName(item),
					cls: 'media-db-plugin-select-title',
				});
				const summaryEl = contentEl.createEl('small', { text: `${item.getSummary()}\n` });
				contentEl.createEl('small', {
					text: `${item.type.toUpperCase() + (item.subType ? ` (${item.subType})` : '')} from ${item.dataSource}`,
				});

				const typedItem = item as MediaTypeModel & { __titleEl?: HTMLElement; __summaryEl?: HTMLElement };
				typedItem.__titleEl = titleEl;
				typedItem.__summaryEl = summaryEl;
			},
		});

		// Auto-fetch detailed info if needed
		this.autoFetchDetails(item, mediaComponent);
	}

	private getImageUrl(item: MediaTypeModel): string | undefined {
		if (item.image && item.image !== 'NSFW') {
			if (!String(item.image).includes('null')) {
				return item.image;
			}
		}
		return item.image;
	}

	private autoFetchDetails(item: MediaTypeModel, mediaComponent: MediaItemComponent): void {
		const needsFetch = !item.image || !item.year;
		if (!needsFetch) return;

		const apiDelay = this.getDelayForApi(item.dataSource);
		const index = this.autoFetchIndex++;
		const delayMs = index * apiDelay;

		console.debug('MDB | will auto-fetch detail for', item.dataSource, item.id, 'in', delayMs, 'ms', `(${apiDelay}ms per request)`);

		window.setTimeout(async () => {
			if (item.image && item.year) return;
			console.debug('MDB | auto-fetching detail for', item.dataSource, item.id);
			try {
				console.debug('MDB | fetching detailed info for', item.dataSource, item.id);
				const detailedResult = await this.plugin.apiManager.queryDetailedInfo(item);
				if (!detailedResult.ok) {
					console.warn('MDB | failed to fetch detailed info', detailedResult.error);
					return;
				}

				const detailed = detailedResult.value;
				console.debug('MDB | detailed fetch result', detailed?.dataSource, detailed?.id, detailed?.image, detailed?.year);

				if (detailed?.image && !item.image) {
					item.image = detailed.image;
					mediaComponent.updateImage(item.image);
				}

				if (!item.year && detailed?.year) {
					item.year = detailed.year;
					const typedItem = item as MediaTypeModel & { __titleEl?: HTMLElement; __summaryEl?: HTMLElement };
					const titleEl = typedItem.__titleEl;
					const summaryEl = typedItem.__summaryEl;
					if (titleEl) titleEl.textContent = this.plugin.mediaTypeManager.getFileName(item);
					if (summaryEl) summaryEl.textContent = `${item.getSummary()}\n`;
				}
			} catch (e) {
				console.warn('MDB | Failed to fetch detail', e);
			}
		}, delayMs);
	}

	// Perform action on the selected suggestion.
	submit(): void {
		if (!this.busy) {
			this.busy = true;
			this.submitButton?.setButtonText('Creating entry...');
			this.submitCallback?.({ selected: this.selectModalElements.filter(x => x.isActive()).map(x => x.value) });
		}
	}

	skip(): void {
		this.skipButton?.setButtonText('Skipping...');
		this.skipCallback?.();
	}

	onClose(): void {
		this.closeCallback?.();
		super.onClose();
	}
}
