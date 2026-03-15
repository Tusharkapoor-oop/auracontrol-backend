/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
            fontFamily: {
                orbitron: ['Orbitron', 'sans-serif'],
                inter: ['Inter', 'sans-serif'],
                fira: ['"Fira Code"', 'monospace'],
            },
            colors: {
                cyan: { DEFAULT: '#00ffff', dark: '#00bcd4' },
                magenta: { DEFAULT: '#ff00ff', dark: '#c800c8' },
                electric: '#0066ff',
                amber: '#ffaa00',
                neon: { green: '#00ff41', purple: '#7b00ff' },
            },
            backdropBlur: { xs: '2px' },
            animation: {
                'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
                'spin-slow': 'spin 3s linear infinite',
                'fade-in': 'fade-in 0.3s ease-out',
                'slide-up': 'slide-up 0.4s cubic-bezier(0.2,0.9,0.3,1)',
                'ripple': 'ripple 0.6s ease-out forwards',
                'scan-line': 'scan-line 3s linear infinite',
            },
            keyframes: {
                'pulse-glow': {
                    '0%, 100%': { boxShadow: '0 0 5px rgba(0,255,255,0.3)' },
                    '50%': { boxShadow: '0 0 25px rgba(0,255,255,0.9), 0 0 50px rgba(0,255,255,0.4)' },
                },
                'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
                'slide-up': { from: { transform: 'translateY(20px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
                'ripple': { '0%': { transform: 'scale(0)', opacity: '1' }, '100%': { transform: 'scale(4)', opacity: '0' } },
                'scan-line': { '0%': { transform: 'translateY(-100%)' }, '100%': { transform: 'translateY(100vh)' } },
            },
        },
    },
    plugins: [],
}
