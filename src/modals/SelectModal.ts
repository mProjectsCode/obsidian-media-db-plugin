import {App, Modal, Setting} from 'obsidian';
import {SelectModalElement} from './SelectModalElement';

export abstract class SelectModal<T> extends Modal {
	allowMultiSelect: boolean;

	title: string;
	description: string;
	skipButton: boolean;

	elements: T[];
	selectModalElements: SelectModalElement<T>[];


	protected constructor(app: App, elements: T[]) {
		super(app);
		this.allowMultiSelect = true;

		this.title = '';
		this.description = '';
		this.skipButton = false;

		this.elements = elements;
		this.selectModalElements = [];
	}

	abstract renderElement(value: T, el: HTMLElement): any;

	abstract submit(): void;

	abstract skip(): void;

	disableAllOtherElements(elementId: number) {
		for (const selectModalElement of this.selectModalElements) {
			if (selectModalElement.id !== elementId) {
				selectModalElement.setActive(false);
			}
		}
	}

	async onOpen() {
		const {contentEl} = this;

		/*
		contentEl.id = 'media-db-plugin-modal'

		contentEl.on('keydown', '#' + contentEl.id, (ev, delegateTarget) => {
			console.log(ev.key);
		});
		*/

		contentEl.createEl('h2', {text: this.title});
		contentEl.createEl('p', {text: this.description});

		const elementWrapper = contentEl.createDiv({cls: 'media-db-plugin-select-wrapper'});

		let i = 0;
		for (const element of this.elements) {
			const selectModalElement = new SelectModalElement(element, contentEl, i, this, false);

			this.selectModalElements.push(selectModalElement);

			this.renderElement(element, selectModalElement.element);

			i += 1;
		}

		const bottomSetting = new Setting(contentEl);
		bottomSetting.addButton(btn => btn.setButtonText('Cancel').onClick(() => this.close()));
		if (this.skipButton) {
			bottomSetting.addButton(btn => btn.setButtonText('Skip').onClick(() => this.skip()));
		}
		bottomSetting.addButton(btn => btn.setButtonText('Ok').setCta().onClick(() => this.submit()));
	}
}
