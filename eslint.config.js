import js from '@eslint/js'; // Reglas estándar de JavaScript
import tseslint from 'typescript-eslint'; // Herramientas para TypeScript en ESLint
import prettier from 'eslint-config-prettier'; // Desactiva reglas de ESLint que choquen con Prettier
import prettierPlugin from 'eslint-plugin-prettier'; // Permite ejecutar Prettier como una regla
import globals from 'globals'; // Define variables globales (node, browser, etc.)

export default tseslint.config(
  js.configs.recommended, // Usa las reglas recomendadas de JavaScript
  ...tseslint.configs.recommended, // Usa las reglas recomendadas de TypeScript
  {
    languageOptions: {
      globals: {
        ...globals.node, // Permite variables de Node.js como 'process'
        ...globals.jest // Permite palabras de tests como 'describe' o 'it'
      }
    },
    plugins: {
      prettier: prettierPlugin // Activa el plugin de Prettier
    },
    rules: {
      'prettier/prettier': 'error', // Si el formato no es de Prettier, da error de ESLint

      // Avisa de variables no usadas (permite las que empiezan con _)
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_'
        }
      ],

      // Avisa si se usa 'any', pero no bloquea
      '@typescript-eslint/no-explicit-any': 'warn',

      // Permite usar el objeto vacío {} como tipo (muy común en Express)
      '@typescript-eslint/no-empty-object-type': 'off',

      // Desactiva el aviso de tipo Function inseguro
      '@typescript-eslint/no-unsafe-function-type': 'off',

      // Permite el uso de console.log en el servidor
      'no-console': 'error'
    }
  },
  prettier, // Desactiva reglas de estilo de ESLint que Prettier ya maneja
  {
    // Carpetas que ESLint no debe analizar
    ignores: ['dist/', 'node_modules/', 'coverage/']
  }
);
