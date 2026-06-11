module.exports = {
  extends: [
    'next/core-web-vitals',
  ],
  rules: {
    // Relax rules for production build
    'no-console': 'off',
    'no-debugger': 'off',
    'react/no-unescaped-entities': 'off',
    'react-hooks/exhaustive-deps': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
  },
};
