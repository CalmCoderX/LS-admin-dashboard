/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary brand colors
        'brand': {
          'navy': '#2a2f56',
          'blue-1': '#282d54',
          'blue-2': '#2d325c',
          'blue-3': '#22274f',
          'blue-4': '#292e55',
          'blue-5': '#2b3059',
        },
        // Background colors
        'bg': {
          'main': '#f2f2f2',
          'light-1': '#f5f5f5',
          'light-2': '#f3f3f3',
          'light-3': '#f4f4f4',
          'light-4': '#ebebeb',
          'light-5': '#ececec',
          'light-6': '#dcdcdc',
        },
        // Text colors
        'text': {
          'primary': '#111322',
          'secondary': '#333333',
          'tertiary': '#0b0b0b',
          'quaternary': '#000000',
        },
        // Gray variations
        'gray': {
          'light': '#a4a4a4',
          'medium-1': '#b2b2b2',
          'medium-2': '#808080',
          'medium-3': '#999999',
        },
        // Status colors
        'status': {
          'success': '#10b981',
          'warning': '#f59e0b',
          'error': '#ef4444',
          'info': '#3b82f6',
        },
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'custom': '0 4px 6px -1px rgba(42, 47, 86, 0.1), 0 2px 4px -1px rgba(42, 47, 86, 0.06)',
        'custom-lg': '0 10px 15px -3px rgba(42, 47, 86, 0.1), 0 4px 6px -2px rgba(42, 47, 86, 0.05)',
      },
    },
  },
  plugins: [],
}
