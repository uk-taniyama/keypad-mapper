module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'airbnb-base',
    'airbnb-typescript/base',
  ],
  // "parser": "@typescript-eslint/parser",
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 13,
    sourceType: 'module',
    project: ['./tsconfig.json'],
  },
  plugins: [
    'unused-imports',
  ],
  // settings: {
  //   'import/resolver': {
  //     typescript: true,
  //   },
  // },
  rules: {
    // 'linebreak-style': 'off',
    'max-len': [
      'warn', {
        code: 120,
        ignoreComments: true,
        ignoreTrailingComments: true,
        ignoreStrings: true,
        ignorePattern: '^import\\s',
      },
    ],
    'sort-imports': ['error', {
      ignoreDeclarationSort: true,
    }],
    'import/order': [
      'error', {
        groups: [
          'builtin',
          'external',
          'parent',
          'sibling',
          'index',
          'object',
          'type',
        ],
        alphabetize: {
          order: 'asc',
        },
        'newlines-between': 'always',
      },
    ],
    'import/no-named-as-default': 'off',
    'import/prefer-default-export': 'off',
    '@typescript-eslint/consistent-type-imports': ['error', {
      prefer: 'type-imports',
    }],
    '@typescript-eslint/type-annotation-spacing': 'error',
    '@typescript-eslint/ban-ts-comment': [
      'error', {
        'ts-expect-error': {
          descriptionFormat: '^: TS\\d+',
        },
      },
    ],
    '@typescript-eslint/no-unused-vars': 'warn',
    '@typescript-eslint/semi': ['error'],
    'unused-imports/no-unused-imports': 'error',
    'unused-imports/no-unused-vars': [
      'warn', {
        vars: 'all', varsIgnorePattern: '^_', args: 'after-used', argsIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/member-delimiter-style': [
      'warn',
      {
        multiline: {
          delimiter: 'semi', requireLast: true,
        },
        singleline: {
          delimiter: 'semi', requireLast: false,
        },
      },
    ],
    'object-curly-newline': ['error', {
      ObjectExpression: {
        minProperties: 4,
        multiline: true,
        consistent: true,
      },
      ObjectPattern: {
        minProperties: 4,
        multiline: true,
        consistent: true,
      },
      ImportDeclaration: 'never',
      ExportDeclaration: 'never',
    }],
    'arrow-body-style': 'off',
    'import/extensions': 'off',
    'max-classes-per-file': 'off',
    'no-continue': 'off',
    'no-underscore-dangle': 'off',
    'no-useless-return': 'off',
  },
  overrides: [
    {
      files: [
        '.eslint.cjs',
        'tsup.config.ts',
        'vitest.config.ts',
        'src/test-utils/**/*',
        'example/**/*',
        '*.spec.ts',
        '*.spec.tsx',
        '*.test.ts',
        '*.test.tsx',
      ],
      rules: {
        'import/no-extraneous-dependencies': 'off',
        'no-console': 'off',
        '@typescript-eslint/ban-ts-comment': 'off',
      },
    },
  ],
};
