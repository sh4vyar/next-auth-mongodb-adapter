import {
  Adapter,
  AdapterUser,
  AdapterAccount,
  AdapterSession,
  VerificationToken,
} from "next-auth/adapters";
import type { MongoClient, ObjectId as MongoObjectId } from "mongodb";
import { ObjectId, GridFSBucket } from "mongodb";
import fetch from "node-fetch";

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

  async function storeAvatar(url: string): Promise<ObjectId> {
    const res = await fetch(url);
    const buffer = await res.buffer();
    const uploadStream = bucket.openUploadStream(
      `${Date.now()}-${Math.random()}`,
      {
        contentType: res.headers.get("content-type") || undefined,
      }
    );
    uploadStream.end(buffer);
    return uploadStream.id as ObjectId;
  }

  return {
    async createUser(user: Omit<AdapterUser, "id">): Promise<AdapterUser> {
      const now = new Date();
      let avatarFileId: ObjectId | undefined;
      if (options.storeImage && user.image) {
        try {
          avatarFileId = await storeAvatar(user.image);
        } catch {}
      }
      const userDoc: any = {
        ...user,
        dateJoined: now,
      };
      if (options.storeImage) {
        userDoc.avatarFileId = avatarFileId;
      }
      if (options.roleBased) {
        userDoc.roles = ["user"];
      }
      const { insertedId } = await users.insertOne(userDoc);
      return {
        id: insertedId.toString(),
        name: user.name ?? null,
        email: user.email ?? null,
        emailVerified: user.emailVerified ?? null,
        image: user.image ?? null,
      };
    },

    async getUser(id: string): Promise<AdapterUser | null> {
      const user = await users.findOne({ _id: new ObjectId(id) });
      if (!user) return null;
      return {
        id: user._id.toString(),
        name: user.name ?? null,
        email: user.email ?? null,
        emailVerified: user.emailVerified ?? null,
        image: user.image ?? null,
      };
    },

    async getUserByEmail(email: string): Promise<AdapterUser | null> {
      const user = await users.findOne({ email });
      if (!user) return null;
      return {
        id: user._id.toString(),
        name: user.name ?? null,
        email: user.email ?? null,
        emailVerified: user.emailVerified ?? null,
        image: user.image ?? null,
      };
    },

    async getUserByAccount({
      provider,
      providerAccountId,
    }: Pick<
      AdapterAccount,
      "provider" | "providerAccountId"
    >): Promise<AdapterUser | null> {
      const account = await accounts.findOne({ provider, providerAccountId });
      if (!account) return null;
      const user = await users.findOne({ _id: account.userId });
      if (!user) return null;
      return {
        id: user._id.toString(),
        name: user.name ?? null,
        email: user.email ?? null,
        emailVerified: user.emailVerified ?? null,
        image: user.image ?? null,
      };
    },

    async updateUser(
      user: Partial<AdapterUser> & Pick<AdapterUser, "id">
    ): Promise<AdapterUser> {
      const { id, ...data } = user;
      await users.updateOne({ _id: new ObjectId(id) }, { $set: data });
      const updated = await users.findOne({ _id: new ObjectId(id) });
      if (!updated) throw new Error("User not found");
      return {
        id: updated._id.toString(),
        name: updated.name ?? null,
        email: updated.email ?? null,
        emailVerified: updated.emailVerified ?? null,
        image: updated.image ?? null,
      };
    },

    async deleteUser(id: string): Promise<void> {
      await users.deleteOne({ _id: new ObjectId(id) });
    },

    async linkAccount(account: AdapterAccount): Promise<void> {
      await accounts.insertOne({
        ...account,
        userId: new ObjectId(account.userId),
      });
    },

    async unlinkAccount({
      provider,
      providerAccountId,
    }: Pick<AdapterAccount, "provider" | "providerAccountId">): Promise<void> {
      await accounts.deleteOne({ provider, providerAccountId });
    },

    async createSession(session: AdapterSession): Promise<AdapterSession> {
      await sessions.insertOne({
        ...session,
        userId: new ObjectId(session.userId),
      });
      return session;
    },

    async getSessionAndUser(sessionToken: string): Promise<{
      session: AdapterSession;
      user: AdapterUser;
    } | null> {
      const session = await sessions.findOne({ sessionToken });
      if (!session) return null;
      const user = await users.findOne({ _id: session.userId });
      if (!user) return null;
      return {
        session: {
          sessionToken: session.sessionToken,
          userId: session.userId.toString(),
          expires: session.expires,
        },
        user: {
          id: user._id.toString(),
          name: user.name ?? null,
          email: user.email ?? null,
          emailVerified: user.emailVerified ?? null,
          image: user.image ?? null,
        },
      };
    },

    async updateSession(
      session: Partial<AdapterSession> & Pick<AdapterSession, "sessionToken">
    ): Promise<AdapterSession | null> {
      const { sessionToken, expires, userId } = session;
      await sessions.updateOne(
        { sessionToken },
        {
          $set: {
            ...(expires && { expires }),
            ...(userId && { userId: new ObjectId(userId) }),
          },
        }
      );
      const updatedSession = await sessions.findOne({ sessionToken });
      if (!updatedSession) return null;
      return {
        sessionToken: updatedSession.sessionToken,
        userId: updatedSession.userId.toString(),
        expires: updatedSession.expires,
      };
    },

    async deleteSession(sessionToken: string): Promise<void> {
      await sessions.deleteOne({ sessionToken });
    },

    async createVerificationToken(
      token: VerificationToken
    ): Promise<VerificationToken> {
      await verificationTokens.insertOne(token);
      return token;
    },

    async useVerificationToken(params: {
      identifier: string;
      token: string;
    }): Promise<VerificationToken | null> {
      const result = await verificationTokens.findOneAndDelete(params);
      return result?.value ?? null;
    },
  };
}
