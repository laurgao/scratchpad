module.exports = {
    purge: {
        layers: ["components", "utilities"],
        content: ["./pages/**/*.tsx", "./components/**/*.tsx", "./**/*.html"],
    },
    theme: {
        container: {
            center: true,
            padding: "1rem",
        },
    },
    variants: {
        extend: {
            backgroundColor: ['disabled'],
        }
    },
    plugins: [],
}
