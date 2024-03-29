import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import { NextApiRequest, NextApiResponse } from 'next';
import { createCsrfSeed } from '../../util/auth';
import { createSerializedCookie } from '../../util/cookies';
import {
  createSession,
  createUserProfile,
  createUserWithHashedPassword,
  getUserByUsername,
} from '../../util/database';
import authenticateUser from '../../util/middleware/authentication';
import { authenticationSchema } from '../../util/schema/authentication';

export type ResponseBody =
  | {
      user: {
        id: number;
      };
    }
  | { error: { message: string }[] };
async function registrationHandler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseBody>,
) {
  if (req.method !== 'POST') {
    res.status(403).json({ error: [{ message: 'Method not allowed' }] });
    return;
  }
  if (await getUserByUsername(req.body.username)) {
    res
      .status(400)
      .json({ error: [{ message: 'Please choose different username' }] });
    return;
  }
  const passwordHash = await bcrypt.hash(req.body.password, 12);
  const newUser = await createUserWithHashedPassword(
    req.body.username,
    passwordHash,
  );
  const userProfile = await createUserProfile(newUser.id);
  const token = crypto.randomBytes(64).toString('base64');

  const csrfSeed = createCsrfSeed();
  const userSession = await createSession(token, newUser.id, csrfSeed);
  const serializedCookie = createSerializedCookie(userSession.token);
  res
    .setHeader('Set-Cookie', serializedCookie)
    .status(200)
    .json({ user: { id: userProfile.userId } });
}

export default authenticateUser(authenticationSchema, registrationHandler);
