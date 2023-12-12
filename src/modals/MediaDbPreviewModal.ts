import { ButtonComponent, Component, MarkdownRenderer, Modal, Setting } from 'obsidian';
import MediaDbPlugin from 'src/main';
import { MediaTypeModel } from 'src/models/MediaTypeModel';
import { PREVIEW_MODAL_DEFAULT_OPTIONS, PreviewModalData, PreviewModalOptions } from '../utils/ModalHelper';
import { CreateNoteOptions } from '../utils/Utils';

export class MediaDbPreviewModal extends Modal {
	plugin: MediaDbPlugin;

	createNoteOptions: CreateNoteOptions;
	elements: MediaTypeModel[];
	isBusy: boolean;
	title: string;
	cancelButton: ButtonComponent;
	submitButton: ButtonComponent;
	markdownComponent: Component;

	submitCallback: (previewModalData: PreviewModalData) => void;
	closeCallback: (err?: Error) => void;

	constructor(plugin: MediaDbPlugin, previewModalOptions: PreviewModalOptions) {
		previewModalOptions = Object.assign({}, PREVIEW_MODAL_DEFAULT_OPTIONS, previewModalOptions);

		super(plugin.app);

		this.plugin = plugin;
		this.title = previewModalOptions.modalTitle;
		this.elements = previewModalOptions.elements;

		this.markdownComponent = new Component();
	}

	setSubmitCallback(submitCallback: (previewModalData: PreviewModalData) => void): void {
		this.submitCallback = submitCallback;
	}

	setCloseCallback(closeCallback: (err?: Error) => void): void {
		this.closeCallback = closeCallback;
	}

	async preview(): Promise<void> {
		const { contentEl } = this;
		contentEl.addClass('media-db-plugin-preview-modal');

		contentEl.createEl('h2', { text: this.title });

		const previewWrapper = contentEl.createDiv({ cls: 'media-db-plugin-preview-wrapper' });

		this.markdownComponent.load();

		for (const result of this.elements) {
			previewWrapper.createEl('h3', { text: result.englishTitle });
			const fileDiv = previewWrapper.createDiv({ cls: 'media-db-plugin-preview' });

			let fileContent = this.plugin.generateMediaDbNoteFrontmatterPreview(result);
			fileContent = `\`\`\`yaml\n${fileContent}\`\`\``;

			try {
				// TODO: fix this not rendering the frontmatter any more
				await MarkdownRenderer.render(this.app, fileContent, fileDiv, '', this.markdownComponent);
			} catch (e) {
				console.warn(`mdb | error during rendering of preview`, e);
			}
		}

		contentEl.createDiv({ cls: 'media-db-plugin-spacer' });

		const bottomSettingRow = new Setting(contentEl);
		bottomSettingRow.addButton(btn => {
			btn.setButtonText('Cancel');
			btn.onClick(() => this.close());
			btn.buttonEl.addClass('media-db-plugin-button');
			this.cancelButton = btn;
		});
		bottomSettingRow.addButton(btn => {
			btn.setButtonText('Ok');
			btn.setCta();
			btn.onClick(() => this.submitCallback({ confirmed: true }));
			btn.buttonEl.addClass('media-db-plugin-button');
			this.submitButton = btn;
		});
	}

	onOpen(): void {
		void this.preview();
	}

	onClose(): void {
		this.markdownComponent.unload();
		this.closeCallback();
	}
}
