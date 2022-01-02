const mongoose = require("mongoose");

module.exports = {
  async up(db, client) {
    // TODO write your migration here.
    // See https://github.com/seppevs/migrate-mongo/#creating-a-new-migration-script
    // Example:
    // await db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: true}});
    const allFiles = await db
      .collection("files")
      .find()
      .toArray();
    console.log(allFiles);

    // make and execute section creation requests
    let requests = [];
    for (let file of allFiles) {
      requests.push({
        insertOne: {
          document: {
            file: mongoose.Types.ObjectId(file._id),
            body: file.body,
          },
        },
      });
      if (requests.length % 100 === 0)
        console.log("creating request " + requests.length);
      if (requests.length === 500) {
        console.log("making bulk requests");
        await db.collection("links").bulkWrite(requests);
        requests = [];
      }
    }
    await db.collection("sections").bulkWrite(requests);

    // delete body
    // await db.collection("files").updateMany({}, {
    //   $unset: { body: "" }
    // });
  },

  async down(db, client) {
    // TODO write the statements to rollback your migration (if possible)
    // Example:
    // await db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: false}});
  },
};
