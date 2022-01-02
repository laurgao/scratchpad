// Source: https://postulate.us/@samsonzhang/p/2021-03-06-Making-Mongodb-Schema-Changes-with-kL4J3vYUhY9V6SK16TisC7

require("dotenv").config();

const config = {
  mongodb: {
    url: process.env.MONGODB_URL,

    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  },

  migrationsDir: "migrations",

  changelogCollectionName: "changelog",

  migrationFileExtension: ".js"
};

module.exports = config;
