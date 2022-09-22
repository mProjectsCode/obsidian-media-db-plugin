import {App, ButtonComponent, Modal, Setting} from 'obsidian';
import {SelectModalElement} from './SelectModalElement';
import {mod} from '../utils/Utils';

export abstract class SelectModal<T> extends Modal {
	allowMultiSelect: boolean;

	title: string;
	description: string;
	addSkipButton: boolean;
	cancelButton?: ButtonComponent;
	skipButton?: ButtonComponent;
	submitButton?: ButtonComponent;

	elements: T[];
	selectModalElements: SelectModalElement<T>[];


	protected constructor(app: App, elements: T[]) {
		super(app);
		this.allowMultiSelect = true;

		this.title = '';
		this.description = '';
		this.addSkipButton = false;
		this.cancelButton = undefined;
		this.skipButton = undefined;
		this.submitButton = undefined;

		this.elements = elements;
		this.selectModalElements = [];

		this.scope.register([], 'ArrowUp', () => {
			this.highlightUp();
		});
		this.scope.register([], 'ArrowDown', () => {
			this.highlightDown();
		});
		this.scope.register([], 'ArrowRight', () => {
			this.activateHighlighted();
		});
		this.scope.register([], 'Enter', () => this.submit());
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

	deHighlightAllOtherElements(elementId: number) {
		for (const selectModalElement of this.selectModalElements) {
			if (selectModalElement.id !== elementId) {
				selectModalElement.setHighlighted(false);
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

		contentEl.addClass('media-db-plugin-select-modal');

		const elementWrapper = contentEl.createDiv({cls: 'media-db-plugin-select-wrapper'});

		let i = 0;
		for (const element of this.elements) {
			const selectModalElement = new SelectModalElement(element, elementWrapper, i, this, false);

			this.selectModalElements.push(selectModalElement);

			this.renderElement(element, selectModalElement.element);

			i += 1;
		}

		this.selectModalElements.first()?.element.scrollIntoView();

		const bottomSettingRow = new Setting(contentEl);
		bottomSettingRow.addButton(btn => this.cancelButton = btn.setButtonText('Cancel').onClick(() => this.close()));
		if (this.addSkipButton) {
			bottomSettingRow.addButton(btn => this.skipButton = btn.setButtonText('Skip').onClick(() => this.skip()));
		}
		bottomSettingRow.addButton(btn => this.submitButton = btn.setButtonText('Ok').setCta().onClick(() => this.submit()));
	}

	activateHighlighted() {
		for (const selectModalElement of this.selectModalElements) {
			if (selectModalElement.isHighlighted()) {
				selectModalElement.setActive(!selectModalElement.isActive());
				if (!this.allowMultiSelect) {
					this.disableAllOtherElements(selectModalElement.id);
				}
			}
		}
	}

	highlightUp() {
		for (const selectModalElement of this.selectModalElements) {
			if (selectModalElement.isHighlighted()) {
				this.getPreviousSelectModalElement(selectModalElement).setHighlighted(true);
				return;
			}
		}

		// nothing is highlighted
		this.selectModalElements.last().setHighlighted(true);
	}

	highlightDown() {
		for (const selectModalElement of this.selectModalElements) {
			if (selectModalElement.isHighlighted()) {
				this.getNextSelectModalElement(selectModalElement).setHighlighted(true);
				return;
			}
		}

		// nothing is highlighted
		this.selectModalElements.first().setHighlighted(true);
	}

	private getNextSelectModalElement(selectModalElement: SelectModalElement<T>): SelectModalElement<T> {
		let nextId = selectModalElement.id + 1;
		nextId = mod(nextId, this.selectModalElements.length);

		return this.selectModalElements.filter(x => x.id === nextId).first();
	}

	private getPreviousSelectModalElement(selectModalElement: SelectModalElement<T>): SelectModalElement<T> {
		let nextId = selectModalElement.id - 1;
		nextId = mod(nextId, this.selectModalElements.length);

		return this.selectModalElements.filter(x => x.id === nextId).first();
	}

}
