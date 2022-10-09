import { MarkdownRenderer, Modal, Setting, TFile } from "obsidian";
import MediaDbPlugin from "src/main";
import { MediaTypeModel } from "src/models/MediaTypeModel";

export class MediaDbPreviewModal extends Modal {
    selectedSearchResults: MediaTypeModel[];
    options: { attachTemplate: boolean, attachFile: TFile};
    submitCallback: (res: boolean) => void;
    closeCallback: (err?: Error) => void;
    plugin: MediaDbPlugin;
    searchBtn: any;
    cancelButton: any;
    submitButton: any;
    busy: any;

    constructor(plugin: MediaDbPlugin, mediaTypeModel: MediaTypeModel[], options: any) {
        super(plugin.app);
        this.plugin = plugin;
        this.selectedSearchResults = mediaTypeModel;
        this.options = options;
    }

    setSubmitCallback(submitCallback: (res: boolean) => void): void {
        this.submitCallback = submitCallback;
    }

    setCloseCallback(closeCallback: (err?: Error) => void): void {
        this.closeCallback = closeCallback;
    }

    async preview(): Promise<void> {
        let { contentEl } = this;
        for (let result of this.selectedSearchResults) {
            let fileContent = await this.plugin.generateMediaDbNoteContents(result, { attachTemplate: this.options.attachTemplate, attachFile: this.options.attachFile });
            this.contentEl.createEl("h3", {text: result.englishTitle});
            const fileDiv = this.contentEl.createDiv();
            fileContent = `\n${fileContent}\n`;
            MarkdownRenderer.renderMarkdown(fileContent, fileDiv, null, null);
        }

        contentEl.createDiv({ cls: 'media-db-plugin-spacer' });

        const bottomSettingRow = new Setting(contentEl);
        bottomSettingRow.addButton(btn => {
            btn.setButtonText('Cancel');
            btn.onClick(() => this.closeCallback());
            btn.buttonEl.addClass('media-db-plugin-button');
            this.cancelButton = btn;
        });
        bottomSettingRow.addButton(btn => {
            btn.setButtonText('Ok');
            btn.setCta();
            btn.onClick(() => this.submitCallback(true));
            btn.buttonEl.addClass('media-db-plugin-button');
            this.submitButton = btn;
        })
    }

    submit() {
        if (!this.busy) {
            this.busy = true;
            this.submitButton.setButtonText('Creating entry...');
            this.submitCallback(true);
        }
    }

    onOpen(): void {
        this.preview()
    }
}