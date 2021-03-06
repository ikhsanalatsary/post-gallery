import { NextApiRequest } from 'next';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { GraphConnection, ID } from '@api/types';
import { GraphConnectionArgs, DecodedJwt } from '../types';
import BaseRepository from './utils/BaseRepository';
import { createLoader } from './utils/createLoader';
import { ForbiddenError, AuthenticationError } from 'apollo-server-micro';
import { AuthTokenModel, UserModel } from './utils/knex';
import { Maybe, Session } from '@api/generated/graphql';
import { findGraphConnection } from './utils/findGraphConnection';

export type AuthTokenGraphConnectionArgs = GraphConnectionArgs & {
  userId: Maybe<ID>;
};

const createAuthTokenByJtiLoader = createLoader<string, AuthTokenModel>(
  (jtis) => AuthTokenModel.query().whereIn('jti', jtis as string[]),
  (authToken) => authToken.jti,
);

const authTokenLoaders = () => ({
  authTokenByJti: createAuthTokenByJtiLoader(),
});

type AuthTokenCreateInput = Pick<
  AuthTokenModel,
  'jti' | 'browser' | 'platform' | 'os' | 'userId'
>;

class AuthTokenRepository extends BaseRepository {
  private loaders = authTokenLoaders();

  async create(input: AuthTokenCreateInput) {
    const { browser, jti, userId, platform, os } = input;
    const authToken = await AuthTokenModel.query().insert({
      browser,
      jti,
      userId,
      platform,
      os,
    });
    return authToken;
  }

  async findOneByJti(jti: ID) {
    const authToken = await this.loaders.authTokenByJti.load(jti);
    return authToken;
  }

  async deleteAllExceptCurrent() {
    const { viewer, authToken } = this.context;
    if (!viewer || !authToken) {
      throw new AuthenticationError('You are not logged in');
    }

    const decodedToken = jwt.decode(authToken) as DecodedJwt;

    const deletedNum = await AuthTokenModel.query()
      .where({
        userId: viewer.id,
      })
      .whereNot({
        jti: decodedToken.jti,
      })
      .delete();

    return !!deletedNum;
  }

  async deleteByJti(jti: ID) {
    const forbiddenError = new ForbiddenError(
      'Not allowed to delete another users session.',
    );

    const { viewer } = this.context;
    if (!viewer) {
      throw forbiddenError;
    }

    const authToken = await this.findOneByJti(jti);

    if (!authToken) {
      throw new AuthenticationError('Auth token not found');
    }

    if (authToken.userId !== viewer.id) {
      throw forbiddenError;
    }

    const deletedNum = await authToken.$query().delete();
    return !!deletedNum;
  }

  getCursor(node: AuthTokenModel) {
    return node.id;
  }

  async findConnection(
    args: AuthTokenGraphConnectionArgs,
  ): Promise<GraphConnection<Session>> {
    const { first, after, userId } = args;

    const { viewer, authToken } = this.context;
    // Users can only search for their own information for now.
    // When we have roles like admins etc,
    // this condition will be expanded.
    if (!viewer || !authToken || !userId || viewer.id !== userId) {
      throw new ForbiddenError('Not allowed to do that');
    }

    const connection = await findGraphConnection<AuthTokenModel>({
      after,
      first,
      getCursorFn: this.getCursor,
      orderBy: 'createdAt',
      tableName: AuthTokenModel.tableName,
      where: (query) => {
        query.where({ userId });
      },
    });

    const decodedToken = jwt.decode(authToken);
    const { jti } = decodedToken as DecodedJwt;

    return {
      ...connection,
      edges: connection.edges.map((edge) => ({
        cursor: edge.cursor,
        node: { ...edge.node, isCurrent: edge.node.jti === jti },
      })),
    };
  }

  async signAndSaveToken(
    useragent: NextApiRequest['useragent'],
    user: UserModel,
  ) {
    const jti = uuidv4();
    const token = jwt.sign({ sub: user.id }, process.env.AUTH_TOKEN_SECRET, {
      jwtid: jti,
    });
    await this.create({
      jti,
      userId: user.id,
      browser: useragent?.browser,
      os: useragent?.os,
      platform: useragent?.platform,
    });
    return token;
  }

  async verifyAndDecode(authToken: string) {
    let verified;
    try {
      verified = jwt.verify(authToken, process.env.AUTH_TOKEN_SECRET);
    } catch (err) {
      return null;
    }
    if (!verified) {
      return null;
    }
    const { jti } = verified as DecodedJwt;
    const foundAuthToken = await this.findOneByJti(jti);
    if (!foundAuthToken) {
      return null;
    }
    return verified;
  }
}

export default AuthTokenRepository;
