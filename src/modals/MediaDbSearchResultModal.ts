import type MediaDbPlugin from '../main';
import type { MediaTypeModel } from '../models/MediaTypeModel';
import type { SelectModalData, SelectModalOptions } from '../utils/ModalHelper';
import { SELECTMODALOPTIONSDEFAULT } from '../utils/ModalHelper';
import { SelectModal } from './SelectModal';

export class MediaDbSearchResultModal extends SelectModal<MediaTypeModel> {
	plugin: MediaDbPlugin;

	busy: boolean;
	sendCallback: boolean;

	submitCallback?: (res: SelectModalData) => void;
	closeCallback?: (err?: Error) => void;
	skipCallback?: () => void;
	submitButtonText: string;

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

	// Renders each suggestion item.
	renderElement(item: MediaTypeModel, el: HTMLElement): void {
		el.addClass('media-db-plugin-select-element-flex');
		el.style.display = 'flex';
		el.style.flexDirection = 'row';
		el.style.gap = '8px';
		el.style.alignItems = 'flex-start';

		const thumb = el.createDiv({ cls: 'media-db-plugin-select-thumb' });

		let imgEl: HTMLImageElement | undefined;
		const setImage = (url: string) => {
			if (!imgEl) {
				imgEl = document.createElement('img');
				imgEl.loading = 'lazy';
				imgEl.alt = item.title;
				thumb.empty();
				thumb.appendChild(imgEl);
				thumb.style.width = '48px';
				thumb.style.height = '72px';
				thumb.style.flex = '0 0 48px';
				thumb.style.overflow = 'hidden';
				imgEl.style.width = '100%';
				imgEl.style.height = '100%';
				imgEl.style.objectFit = 'cover';
				// Show photograph emoticon if the link to the image fails to load
				imgEl.onerror = () => {
					thumb.empty();
					const placeholderSpan = thumb.createEl('span', { text: '📷' });
					placeholderSpan.style.fontSize = '24px';
					placeholderSpan.style.display = 'flex';
					placeholderSpan.style.alignItems = 'center';
					placeholderSpan.style.justifyContent = 'center';
					placeholderSpan.style.width = '100%';
					placeholderSpan.style.height = '100%';
				};
			}
			imgEl.src = url;
		};

		// Create content early so updateSummary can reference its elements
		const content = el.createDiv({ cls: 'media-db-plugin-select-content' });
		const titleEl = content.createEl('div', { text: this.plugin.mediaTypeManager.getFileName(item), cls: 'media-db-plugin-select-title' });
		const summaryEl = content.createEl('small', { text: `${item.getSummary()}\n` });
		content.createEl('small', { text: `${item.type.toUpperCase() + (item.subType ? ` (${item.subType})` : '')} from ${item.dataSource}` });

		// Helper to update both title and summary when year is fetched
		const updateSummary = () => {
			titleEl.textContent = this.plugin.mediaTypeManager.getFileName(item);
			summaryEl.textContent = `${item.getSummary()}\n`;
		};

		if (item.image && item.image !== 'NSFW') {
			if (String(item.image).includes('null')) {
				console.debug('MDB | image URL invalid (contains null), skipping', item.image);
				thumb.empty();
				const placeholderSpan = thumb.createEl('span', { text: '📷' });
				placeholderSpan.style.fontSize = '24px';
				placeholderSpan.style.display = 'flex';
				placeholderSpan.style.alignItems = 'center';
				placeholderSpan.style.justifyContent = 'center';
				placeholderSpan.style.width = '100%';
				placeholderSpan.style.height = '100%';
			} else {
				setImage(item.image);
			}
		} else if (item.image === 'NSFW') {
			thumb.createEl('span', { text: 'NSFW' });
		} else {
			thumb.empty();
			const placeholderSpan = thumb.createEl('span', { text: '📷' });
			placeholderSpan.style.fontSize = '24px';
			placeholderSpan.style.display = 'flex';
			placeholderSpan.style.alignItems = 'center';
			placeholderSpan.style.justifyContent = 'center';
			placeholderSpan.style.width = '100%';
			placeholderSpan.style.height = '100%';
			// Auto-fetch detailed info with staggered delays to avoid rate limits + fetch detailed info if no image (most API's except for MusicBrainz) OR no year (like SteamAPI)
			const needsFetch = !item.image || !item.year;
			if (needsFetch) {
				const delayMs = (parseInt(el.id.split('-').pop() ?? '0') ?? 0) * 200;
				console.debug('MDB | will auto-fetch detail for', item.dataSource, item.id, 'in', delayMs, 'ms');
				setTimeout(async () => {
					if (item.image && item.year) return;
					console.debug('MDB | auto-fetching detail for', item.dataSource, item.id);
					try {
						console.debug('MDB | fetching detailed info for', item.dataSource, item.id);
						const detailed = await this.plugin.apiManager.queryDetailedInfo(item);
						console.debug('MDB | detailed fetch result', detailed?.dataSource, detailed?.id, detailed?.image, detailed?.year);
						if (detailed?.image && !item.image) {
							item.image = detailed.image;
							setImage(detailed.image);
						}
						if (!item.year && detailed?.year) {
							item.year = detailed.year;
							updateSummary();
						}
					} catch (e) {
						console.warn('MDB | Failed to fetch detail', e);
					}
				}, delayMs);
			}
		}
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
	}
}
