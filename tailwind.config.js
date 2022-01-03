module.exports = {
    purge: {
        enabled: true,
        content: ["./**/*.tsx", "./**/*.html"],
        // ** matches any number of directories from ./components to /*.tsx
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
