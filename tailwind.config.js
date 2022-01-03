module.exports = {
    purge: {
        enabled: true,
           layers: ["components", "utilities"],
           content: ["./pages/**/*.tsx", "./components/**/*.tsx", "./**/*.html"],
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
