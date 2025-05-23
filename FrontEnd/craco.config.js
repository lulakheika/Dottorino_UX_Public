const path = require('path');

module.exports = {
    style: {
        postcss: {
            plugins: [
                require('tailwindcss'),
                require('autoprefixer'),
            ],
        },
    },
    webpack: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
        },
    },
    devServer: {
        allowedHosts: ['dottorino.pcok.it', 'localhost'],
    }
} 