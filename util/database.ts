import camelcaseKeys from 'camelcase-keys';
import { config } from 'dotenv-safe';
import postgres from 'postgres';

config();

declare module globalThis {
  let postgresSqlClient: ReturnType<typeof postgres> | undefined;
}
function connectOneTimeToDatabase() {
  let sql;
  if (process.env.NODE_ENV === 'production' && process.env.DATABASE_URL) {
    sql = postgres({ ssl: { rejectUnauthorized: false } });
  } else {
    if (!globalThis.postgresSqlClient) {
      globalThis.postgresSqlClient = postgres();
    }
    sql = globalThis.postgresSqlClient;
  }
  return sql;
}

const sql = connectOneTimeToDatabase();
export default sql;

export type User = {
  id: number;
  username: string;
};

export type UserProfile = {
  id: number;
  username: string;
  bio: string | null;
  user_id: number;
};

type UserWithHashedPassword = User & {
  passwordHash: string;
};

export type Session = {
  id: number;
  token: string;
};

export async function createUserWithHashedPassword(
  username: string,
  hashedPassword: string,
) {
  const [user] = await sql<[User]>`
    INSERT INTO users(username, password_hash)
    VALUES(${username}, ${hashedPassword})
    RETURNING id,username`;
  return camelcaseKeys(user);
}

export async function getUserByUsername(username: string) {
  if (!username) return undefined;
  const [user] = await sql<[User | undefined]>`SELECT username
    from users
    WHERE username = ${username}`;
  return user && camelcaseKeys(user);
}

export async function getUserWithHashedPassword(username: string) {
  if (!username) return undefined;
  const [user] = await sql<[UserWithHashedPassword]>`
  SELECT *
  FROM users
  where username = ${username}
  `;
  return camelcaseKeys(user);
}

export async function createUserProfile(username: string, userId: number) {
  const [userProfile] = await sql<[UserProfile]>`
  INSERT INTO user_profiles(username, user_id)
    VALUES(${username}, ${userId})
    RETURNING username, bio, user_id
    `;
  return camelcaseKeys(userProfile);
}

export async function createSession(token: string, userId: number) {
  const [session] = await sql<[Session]>`
  INSERT INTO sessions (token, user_id)
  VALUES(${token}, ${userId})
  RETURNING id, token
  `;
  await deleteExpiredSession();
  return camelcaseKeys(session);
}

export async function deleteExpiredSession() {
  const sessions = await sql`
  DELETE FROM sessions WHERE expiry_timestamp < now()`;
  return sessions.map((session) => camelcaseKeys(session));
}

export async function deleteSessionByToken(token: string) {
  const [session] = await sql<[Session | undefined]>`
  DELETE FROM sessions WHERE token = ${token}
  RETURNING *`;
  return session && camelcaseKeys(session);
}

export async function getUserProfileByUsername(username: string) {
  const [userProfile] = await sql`
    SELECT username, bio, user_id
    FROM user_profiles
    WHERE username = ${username}`;
  return camelcaseKeys(userProfile);
}

export async function getUserProfileByValidSessionToken(token: string) {
  if (!token) return undefined;
  const [user] = await sql`
  SELECT user_profiles.username, user_profiles.bio, user_profiles.user_id
  FROM user_profiles, sessions
  WHERE sessions.token = ${token}
  AND sessions.expiry_timestamp > now()
  AND sessions.user_id = user_profiles.id
  `;
  return camelcaseKeys(user);
}