import type { TFile } from 'obsidian';
import { TFolder } from 'obsidian';
import { Notice, normalizePath, parseYaml, requestUrl, stringifyYaml } from 'obsidian';
import type MediaDbPlugin from 'packages/obsidian/src/main';
import { ConfirmOverwriteModal } from 'packages/obsidian/src/modals/ConfirmOverwriteModal';
import type { MediaTypeModel } from 'packages/obsidian/src/models/MediaTypeModel';
import { Logger } from 'packages/obsidian/src/utils/Logger';
import type { MDBError } from 'packages/obsidian/src/utils/MDBError';
import { MDBErrorKind, toMdbError } from 'packages/obsidian/src/utils/MDBError';
import type { MediaType } from 'packages/obsidian/src/utils/MediaType';
import type { Result } from 'packages/obsidian/src/utils/result';
import { err, ok } from 'packages/obsidian/src/utils/result';
import type { CreateNoteOptions } from 'packages/obsidian/src/utils/Utils';
import { hasTemplaterPlugin, replaceIllegalFileNameCharactersInString, useTemplaterPluginInFile } from 'packages/obsidian/src/utils/Utils';

export type Metadata = Record<string, unknown>;

export interface MediaTypeModelObj {
	id: string;
	type: MediaType;
	dataSource: string;
}

export class MediaDbFileHelper {
	readonly plugin: MediaDbPlugin;
	private readonly frontMatterRegExpPattern = '^(---)\\n[\\s\\S]*?\\n---';

	constructor(plugin: MediaDbPlugin) {
		this.plugin = plugin;
	}

	async createMediaDbNotes(models: MediaTypeModel[], attachFile?: TFile): Promise<Result<void, MDBError>> {
		const results = await Promise.all(models.map(model => this.createMediaDbNoteFromModel(model, { attachTemplate: true, attachFile })));

		const failures = results.filter(result => !result.ok);
		if (failures.length > 0) {
			Logger.warn(
				'MDB | Some notes failed to create:',
				failures.map(result => result.error),
			);
			new Notice(`${models.length - failures.length} of ${models.length} notes created successfully.`);
			return err(failures[0].error);
		}

		return ok(undefined);
	}

	async createMediaDbNoteFromModel(mediaTypeModel: MediaTypeModel, options: CreateNoteOptions): Promise<Result<void, MDBError>> {
		Logger.debug('MDB | creating new note');

		options.openNote = this.plugin.settings.openNoteInNewTab;

		if (this.plugin.settings.imageDownload) {
			const imageResult = await this.downloadImageForMediaModel(mediaTypeModel);
			if (!imageResult.ok) {
				return imageResult;
			}
		}

		const fileContentResult = await this.attempt(() => this.generateMediaDbNoteContents(mediaTypeModel, options), {
			kind: MDBErrorKind.Unexpected,
			message: 'Failed to generate note contents',
			userMessage: 'Failed to generate note contents',
		});
		if (!fileContentResult.ok) {
			return fileContentResult;
		}

		const folderResult = await this.attempt(() => this.plugin.mediaTypeManager.getFolder(mediaTypeModel, this.plugin.app), {
			kind: MDBErrorKind.Vault,
			message: 'Failed to determine note folder',
			userMessage: 'Failed to determine note folder',
		});
		if (!folderResult.ok) {
			return folderResult;
		}

		options.folder ??= folderResult.value;

		const targetFileResult = await this.createNote(this.plugin.mediaTypeManager.getFileName(mediaTypeModel), fileContentResult.value, options);
		if (!targetFileResult.ok) {
			return targetFileResult;
		}

		if (this.plugin.settings.enableTemplaterIntegration) {
			const templaterResult = await this.attempt(() => useTemplaterPluginInFile(this.plugin.app, targetFileResult.value), {
				kind: MDBErrorKind.Unexpected,
				message: 'Failed to apply templater to the note',
				userMessage: 'Failed to apply templater to the note',
			});
			if (!templaterResult.ok) {
				return templaterResult;
			}
		}

		return ok(undefined);
	}

	async updateActiveNote(onlyMetadata: boolean = false): Promise<void> {
		const activeFile = this.plugin.app.workspace.getActiveFile() ?? undefined;
		if (!activeFile) {
			throw new Error('MDB | there is no active note');
		}

		let metadata = this.getMetadataFromFileCache(activeFile);
		metadata = this.plugin.modelPropertyMapper.convertObjectBack(metadata);

		Logger.debug(`MDB | read metadata`, metadata);

		if (!metadata?.type || !metadata?.dataSource || !metadata?.id) {
			throw new Error('MDB | active note is not a Media DB entry or is missing metadata');
		}

		const validOldMetadata: MediaTypeModelObj = metadata as unknown as MediaTypeModelObj;
		Logger.debug(`MDB | validOldMetadata`, validOldMetadata);

		const oldMediaTypeModel = this.plugin.mediaTypeManager.createMediaTypeModelFromMediaType(validOldMetadata, validOldMetadata.type);
		Logger.debug(`MDB | oldMediaTypeModel created`, oldMediaTypeModel);

		const newMediaTypeModelResult = await this.plugin.apiManager.queryDetailedInfoById(validOldMetadata.id, validOldMetadata.dataSource);
		if (!newMediaTypeModelResult.ok) {
			this.plugin.errorReporter.report(newMediaTypeModelResult.error);
			return;
		}

		let newMediaTypeModel = newMediaTypeModelResult.value;
		if (!newMediaTypeModel) {
			return;
		}

		newMediaTypeModel = Object.assign(oldMediaTypeModel, newMediaTypeModel.getWithOutUserData());
		Logger.debug(`MDB | newMediaTypeModel after merge`, newMediaTypeModel);

		if (onlyMetadata) {
			const result = await this.createMediaDbNoteFromModel(newMediaTypeModel, { attachFile: activeFile, folder: activeFile.parent ?? undefined, openNote: true });
			if (!result.ok) {
				this.plugin.errorReporter.report(result.error);
			}
		} else {
			const result = await this.createMediaDbNoteFromModel(newMediaTypeModel, { attachTemplate: true, folder: activeFile.parent ?? undefined, openNote: true });
			if (!result.ok) {
				this.plugin.errorReporter.report(result.error);
			}
		}
	}

	generateMediaDbNoteFrontmatterPreview(mediaTypeModel: MediaTypeModel): string {
		const fileMetadata = this.plugin.modelPropertyMapper.convertObject(mediaTypeModel.toMetaDataObject());
		return stringifyYaml(fileMetadata);
	}

	async generateMediaDbNoteContents(mediaTypeModel: MediaTypeModel, options: CreateNoteOptions): Promise<string> {
		let template = await this.plugin.mediaTypeManager.getTemplate(mediaTypeModel, this.plugin.app);
		let fileMetadata: Record<string, unknown>;

		if (this.plugin.settings.useDefaultFrontMatter) {
			fileMetadata = this.plugin.modelPropertyMapper.convertObject(mediaTypeModel.toMetaDataObject());
		} else {
			fileMetadata = {
				id: mediaTypeModel.id,
				type: mediaTypeModel.type,
				dataSource: mediaTypeModel.dataSource,
			};
		}

		let fileContent = '';
		template = options.attachTemplate ? template : '';

		({ fileMetadata, fileContent } = await this.attachFile(fileMetadata, fileContent, options.attachFile));
		({ fileMetadata, fileContent } = await this.attachTemplate(fileMetadata, fileContent, template));

		if (this.plugin.settings.enableTemplaterIntegration && hasTemplaterPlugin(this.plugin.app)) {
			fileContent = `---\n<%* const media = ${JSON.stringify(mediaTypeModel)} %>\n${stringifyYaml(fileMetadata)}---\n${fileContent}`;
		} else {
			fileContent = `---\n${stringifyYaml(fileMetadata)}---\n${fileContent}`;
		}

		return fileContent;
	}

	async attachFile(fileMetadata: Metadata, fileContent: string, fileToAttach?: TFile): Promise<{ fileMetadata: Metadata; fileContent: string }> {
		if (!fileToAttach) {
			return { fileMetadata, fileContent };
		}

		const attachFileMetadata = this.getMetadataFromFileCache(fileToAttach);
		fileMetadata = { ...attachFileMetadata, ...fileMetadata };

		let attachFileContent = await this.plugin.app.vault.read(fileToAttach);
		const regExp = new RegExp(this.frontMatterRegExpPattern);
		attachFileContent = attachFileContent.replace(regExp, '');
		attachFileContent = attachFileContent.startsWith('\n') ? attachFileContent.substring(1) : attachFileContent;
		fileContent += attachFileContent;

		return { fileMetadata, fileContent };
	}

	async attachTemplate(fileMetadata: Metadata, fileContent: string, template: string | undefined): Promise<{ fileMetadata: Metadata; fileContent: string }> {
		if (!template) {
			return { fileMetadata, fileContent };
		}

		const templateMetadata = this.getMetaDataFromFileContent(template);
		fileMetadata = { ...templateMetadata, ...fileMetadata };

		const regExp = new RegExp(this.frontMatterRegExpPattern);
		const attachFileContent = template.replace(regExp, '');
		fileContent += attachFileContent;

		return { fileMetadata, fileContent };
	}

	getMetaDataFromFileContent(fileContent: string): Metadata {
		const regExp = new RegExp(this.frontMatterRegExpPattern);
		const frontMatterRegExpResult = regExp.exec(fileContent);
		if (!frontMatterRegExpResult) {
			return {};
		}

		let frontMatter = frontMatterRegExpResult[0];
		if (!frontMatter) {
			return {};
		}

		frontMatter = frontMatter.substring(4);
		frontMatter = frontMatter.substring(0, frontMatter.length - 3);

		let metadata = parseYaml(frontMatter) as Metadata;
		if (!metadata) {
			metadata = {};
		}

		Logger.debug(`MDB | metadata read from file content`, metadata);

		return metadata;
	}

	getMetadataFromFileCache(file: TFile): Metadata {
		const metadata: Metadata | undefined = this.plugin.app.metadataCache.getFileCache(file)?.frontmatter;
		return structuredClone(metadata ?? {});
	}

	async createNote(fileName: string, fileContent: string, options: CreateNoteOptions): Promise<Result<TFile, MDBError>> {
		const folder = options.folder ?? this.plugin.app.vault.getAbstractFileByPath('/');

		if (!folder || !(folder instanceof TFolder)) {
			return err({ kind: MDBErrorKind.Validation, message: 'MDB | invalid folder', userMessage: 'MDB | invalid folder' });
		}

		fileName = replaceIllegalFileNameCharactersInString(fileName);
		const filePath = `${folder.path}/${fileName}.md`;

		const file = this.plugin.app.vault.getAbstractFileByPath(filePath);
		if (file) {
			const shouldOverwrite = await new Promise<boolean>(resolve => {
				new ConfirmOverwriteModal(this.plugin.app, fileName, resolve).open();
			});

			if (!shouldOverwrite) {
				return err({ kind: MDBErrorKind.Cancelled, message: 'MDB | file creation cancelled by user', userMessage: 'MDB | file creation cancelled by user' });
			}

			await this.plugin.app.fileManager.trashFile(file);
		}

		const targetFile = await this.plugin.app.vault.create(filePath, fileContent);
		Logger.debug(`MDB | created new file at ${filePath}`);

		if (options.openNote) {
			const activeLeaf = this.plugin.app.workspace.getLeaf(false);
			if (!activeLeaf) {
				Logger.warn('MDB | no active leaf, not opening newly created note');
				return ok(targetFile);
			}
			await activeLeaf.openFile(targetFile, { state: { mode: 'source' } });
		}

		return ok(targetFile);
	}

	private async downloadImageForMediaModel(mediaTypeModel: MediaTypeModel): Promise<Result<void, MDBError>> {
		if (mediaTypeModel.image && typeof mediaTypeModel.image === 'string' && mediaTypeModel.image.startsWith('http')) {
			const imageUrl = mediaTypeModel.image;
			const imageResult = await this.attempt(
				async () => {
					const imageExt = imageUrl.split('.').pop()?.split(/#|\?/)[0] ?? 'jpg';
					const imageFileName = `${replaceIllegalFileNameCharactersInString(`${mediaTypeModel.type}_${mediaTypeModel.title} (${mediaTypeModel.year})`)}.${imageExt}`;
					const imagePath = normalizePath(`${this.plugin.settings.imageFolder}/${imageFileName}`);

					if (!this.plugin.app.vault.getAbstractFileByPath(this.plugin.settings.imageFolder)) {
						await this.plugin.app.vault.createFolder(this.plugin.settings.imageFolder);
					}

					if (!this.plugin.app.vault.getAbstractFileByPath(imagePath)) {
						const response = await requestUrl({ url: imageUrl, method: 'GET' });
						await this.plugin.app.vault.createBinary(imagePath, response.arrayBuffer);
					}

					mediaTypeModel.image = `[[${imagePath}]]`;
				},
				{
					kind: MDBErrorKind.Network,
					message: 'MDB | Failed to download image',
					userMessage: 'Failed to download image',
				},
			);

			if (!imageResult.ok) {
				Logger.warn('MDB | Failed to download image:', imageResult.error);
				return imageResult;
			}
		}

		return ok(undefined);
	}

	private async attempt<T>(operation: () => Promise<T> | T, fallback: Omit<MDBError, 'cause'>): Promise<Result<T, MDBError>> {
		return await Promise.resolve()
			.then(operation)
			.then(
				value => ok(value),
				cause => err(toMdbError(cause, fallback)),
			);
	}
}
