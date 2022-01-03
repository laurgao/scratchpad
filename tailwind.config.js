module.exports = {
    purge: {
        enabled: true,
           layers: ["components", "utilities"],
           content: ["./**/*.tsx", "./**/*.html"],
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
