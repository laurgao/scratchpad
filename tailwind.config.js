module.exports = {
    purge: {
        enabled: true,
        preserveHtmlElements: false,
        content: [
            './**/*.html',
            './**/*.tsx',
        ],
        options: {
            safelist: ["hover"],
        },
    },
    theme: {
        container: {
            center: true,
            padding: "1rem",
        },
    },
    variants: {},
    plugins: [],
}
