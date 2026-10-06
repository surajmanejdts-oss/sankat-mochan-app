require("dotenv").config();

const mongoose = require("mongoose");

const INDEX_NAME = "sourceApplication_unique_objectid";
const INDEX_KEY = { sourceApplication: 1 };

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI must be configured in .env");
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const collection = mongoose.connection.collection("receipts");
  const indexes = await collection.indexes();
  const currentIndex = indexes.find((index) =>
    index.key?.sourceApplication === 1 &&
    Object.keys(index.key).length === 1
  );

  if (
    currentIndex &&
    currentIndex.name !== INDEX_NAME &&
    currentIndex.unique &&
    currentIndex.sparse &&
    !currentIndex.partialFilterExpression
  ) {
    await collection.dropIndex(currentIndex.name);
  }

  const remainingIndexes = await collection.indexes();
  const correctIndex = remainingIndexes.find((index) => index.name === INDEX_NAME);
  if (!correctIndex) {
    await collection.createIndex(INDEX_KEY, {
      name: INDEX_NAME,
      unique: true,
      partialFilterExpression: {
        sourceApplication: { $type: "objectId" }
      }
    });
  } else if (
    !correctIndex.unique ||
    correctIndex.partialFilterExpression?.sourceApplication?.$type !== "objectId"
  ) {
    throw new Error(`Index ${INDEX_NAME} exists with unexpected options.`);
  }

  console.log("Receipt application index now ignores null sourceApplication values.");
}

main()
  .catch((error) => {
    console.error("Receipt index migration failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
