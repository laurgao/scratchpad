module.exports = {
  async up(db, client) {
    // TODO write your migration here.
    // See https://github.com/seppevs/migrate-mongo/#creating-a-new-migration-script
    // Example:
    // await db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: true}});
    let requests = []

    const allFiles = await db.collection("files").find().toArray();
    for (let file of allFiles) {
      const sections = await db.collection("sections").find({file: file._id}).toArray();
      // verify they're in order by createdAt?

      const mongoose = require('mongoose');
      const sectionsOrder = sections.map(s => mongoose.Types.ObjectId(s._id));

      requests.push({
        updateOne: {
          filter: {_id: file._id},
          update: {$set: {sectionsOrder: sectionsOrder}},
        }
      });

      if (requests.length % 100 === 0) console.log("creating request " + requests.length);
      if (requests.length === 500) {
        console.log("making bulk requests");
        await db.collection("files").bulkWrite(requests);
        requests = [];
      }

    }

    await db.collection("files").bulkWrite(requests);
  },

  async down(db, client) {
    // TODO write the statements to rollback your migration (if possible)
    // Example:
    // await db.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: false}});
    await db.collection("files").updateMany({}, {
      $unset: { sectionsOrder: null }
    });
  }
};
