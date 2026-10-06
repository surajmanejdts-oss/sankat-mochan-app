require("dotenv").config();

const mongoose = require("mongoose");
const Receipt = require("../models/Receipt");
const Application = require("../models/Application");

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI must be configured in .env");
  }

  await mongoose.connect(process.env.MONGODB_URI);
  const legacyApplications = await Application.find({
    cooperationAmount: { $gt: 0 }
  }).select("_id membershipFee cooperationAmount").lean();

  if (legacyApplications.length) {
    await Application.bulkWrite(legacyApplications.map((application) => ({
      updateOne: {
        filter: {
          _id: application._id,
          membershipFee: application.membershipFee,
          cooperationAmount: application.cooperationAmount
        },
        update: {
          $set: {
            membershipFee: Number(application.membershipFee || application.cooperationAmount),
            cooperationAmount: 0
          }
        }
      }
    })));
  }

  const applications = await Application.find()
    .select("_id membershipFee cooperationAmount paymentMethod transactionReference")
    .lean();
  const applicationById = new Map(
    applications.map((application) => [application._id.toString(), application])
  );
  const receipts = await Receipt.find({
    type: "application",
    sourceApplication: { $ne: null }
  }).select("_id amount description sourceApplication metadata").lean();
  const updates = [];

  for (const receipt of receipts) {
    const application = applicationById.get(receipt.sourceApplication.toString());
    if (!application) continue;

    const amount = Number(application.membershipFee || 0);
    const cooperationAmount = Number(application.cooperationAmount || 0);
    const descriptionParts = [
      `Membership fee: ₹${amount.toLocaleString("en-IN")}`,
      `Cooperation amount: ₹${cooperationAmount.toLocaleString("en-IN")}`
    ];
    if (application.paymentMethod) {
      descriptionParts.push(`Payment method: ${application.paymentMethod}`);
    }
    if (application.transactionReference) {
      descriptionParts.push(`Transaction reference: ${application.transactionReference}`);
    }
    const description = `Membership application receipt. ${descriptionParts.join(" • ")}.`;
    const metadata = {
      ...(receipt.metadata || {}),
      membershipFee: amount,
      cooperationAmount,
      applicationAmount: amount
    };

    if (receipt.amount !== amount || receipt.description !== description ||
      receipt.metadata?.membershipFee !== amount ||
      receipt.metadata?.cooperationAmount !== cooperationAmount ||
      receipt.metadata?.applicationAmount !== amount) {
      updates.push({
        updateOne: {
          filter: { _id: receipt._id },
          update: { $set: { amount, description, metadata } }
        }
      });
    }
  }

  const result = updates.length ? await Receipt.bulkWrite(updates) : { modifiedCount: 0 };
  console.log(
    `Migrated ${legacyApplications.length} legacy application(s) and synced ${result.modifiedCount} application receipt(s).`
  );
}

main()
  .catch((error) => {
    console.error("Application receipt migration failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
