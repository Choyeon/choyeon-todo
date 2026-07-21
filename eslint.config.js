import js from '@eslint/js'
import vue from 'eslint-plugin-vue'
import prettier from 'eslint-plugin-prettier'
import globals from 'globals'

export default [
  {
    ignores: ['dist/', 'app-build/', 'node_modules/', 'dist-web/', 'tests/setup.js']
  },
  js.configs.recommended,
  ...vue.configs['flat/recommended'],
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.vitest,
        __APP_VERSION__: 'readonly'
      }
    },
    plugins: {
      prettier
    },
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'off',
      'vue/max-attributes-per-line': 'off',
      'vue/html-closing-bracket-newline': 'off',
      'vue/html-indent': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/html-self-closing': 'off',
      'vue/attributes-order': 'off',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'vue/no-unused-vars': 'off',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prettier/prettier': 'warn',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-case-declarations': 'off'
    }
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.vitest,
        beforeEach: 'readonly',
        afterEach: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        vi: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': 'off',
      'prettier/prettier': 'off',
      'no-undef': 'off'
    }
  }
]
