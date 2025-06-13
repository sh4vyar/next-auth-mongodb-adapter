import { GridFSBucket, ObjectId } from "mongodb";

import {
  Adapter,
  AdapterUser,
  AdapterAccount,
  AdapterSession,
  VerificationToken,
} from "@auth/core/adapters";
import type { MongoClient } from "mongodb";

type AdapterOptions = {
  storeImage?: boolean;
  roleBased?: boolean;
};

export default function MongoDBAdapter(
  client: MongoClient,
  options: AdapterOptions = {}
): Adapter {
  const db = client.db();
  const users = db.collection("users");
  const accounts = db.collection("accounts");
  const sessions = db.collection("sessions");
  const verificationTokens = db.collection("verificationTokens");
  const bucket = new GridFSBucket(db, { bucketName: "avatars" });
}
