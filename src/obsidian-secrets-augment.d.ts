import type { App, BaseComponent } from 'obsidian';

declare module 'obsidian' {
	/** @public @since 1.11.4 */
	export class SecretStorage {
		setSecret(id: string, secret: string): void;
		getSecret(id: string): string | null;
		listSecrets(): string[];
	}

	/** @public @since 1.11.1 */
	export class SecretComponent extends BaseComponent {
		constructor(app: App, containerEl: HTMLElement);
		setValue(value: string): this;
		onChange(cb: (value: string) => unknown): this;
	}

	interface App {
		secretStorage: SecretStorage;
	}

	interface Setting {
		addComponent<T extends BaseComponent>(cb: (el: HTMLElement) => T): this;
	}
}
