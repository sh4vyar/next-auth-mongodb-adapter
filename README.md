# next-auth-mongodb-adapter

A custom MongoDB adapter for [NextAuth.js](https://next-auth.js.org/).

## Features

- Full support for users, sessions, accounts, and verification tokens
- Built on top of the official `mongodb` driver
- TypeScript-first

## Installation

```bash
# soon: npm install sh4vyar/next-auth-mongodb-adapter
```

## Usage

```tsx
import NextAuth from "next-auth";
import { MongoClient } from "mongodb";
import MongoDBAdapter from "next-auth-mongodb-adapter";

const client = new MongoClient(process.env.MONGODB_URI!);

export default NextAuth({
  adapter: MongoDBAdapter(client),
  ...
});
```
