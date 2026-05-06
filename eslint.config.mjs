// @ts-check

import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import only_warn from 'eslint-plugin-only-warn';
import no_relative_import_paths from 'eslint-plugin-no-relative-import-paths';
import obsidianmd from 'eslint-plugin-obsidianmd';

export default defineConfig(
	{
		ignores: ['npm/', 'node_modules/', 'exampleVault/', 'automation/', 'main.js', '*.css'],
	},
	{
		files: ['packages/obsidian/src/**/*.ts'],
		extends: [
			eslint.configs.recommended,
			...tseslint.configs.recommended,
			...tseslint.configs.recommendedTypeChecked,
			...tseslint.configs.stylisticTypeChecked,
			...obsidianmd.configs.recommended,
		],
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				project: true,
			},
		},
		plugins: {
			// @ts-ignore
			'only-warn': only_warn,
			'no-relative-import-paths': no_relative_import_paths,
			obsidianmd: obsidianmd,
		},
		rules: {
			'@typescript-eslint/no-explicit-any': ['warn'],

			'@typescript-eslint/no-unused-vars': [
				'error',
				{ argsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
			],
			'@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports', fixStyle: 'separate-type-imports' }],

			'import/consistent-type-specifier-style': ['error', 'prefer-top-level'],
			'import/order': [
				'error',
				{
					'newlines-between': 'never',
					alphabetize: { order: 'asc', orderImportKind: 'asc', caseInsensitive: true },
				},
			],

			'@typescript-eslint/no-confusing-void-expression': ['error', { ignoreArrowShorthand: true }],
			'@typescript-eslint/restrict-template-expressions': 'off',

			'no-relative-import-paths/no-relative-import-paths': ['warn', { allowSameFolder: false }],

			'@typescript-eslint/ban-ts-comment': 'off',
			'@typescript-eslint/no-empty-function': 'off',
			'@typescript-eslint/no-inferrable-types': 'off',
			'@typescript-eslint/explicit-function-return-type': ['warn'],
			'@typescript-eslint/no-deprecated': 'off',

			'obsidianmd/ui/sentence-case': 'off',
		},
	},
);
