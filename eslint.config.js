import globals from 'globals';
import tseslint from 'typescript-eslint';

export default [
    {
        files: ['src/**/*.{js,ts}'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.browser,
            },
        },
        rules: {
            'no-unused-vars': 'warn',
            'no-console': 'off',
            '@typescript-eslint/no-explicit-any': 'warn',
        },
        ignores: [
            'node_modules/',
            'dist/',
            'build/',
            'target/',
            '*.config.js',
            'vite.config.ts',
        ],
    },
    ...tseslint.configs.recommended,
];
