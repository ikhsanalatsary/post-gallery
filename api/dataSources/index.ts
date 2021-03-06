import PostAPI from './PostAPI';
import MediaAPI from './MediaAPI';
import CommentAPI from './CommentAPI';
import { UserAPI } from './UserAPI';
import ReactionAPI from './ReactionAPI';
import { AuthTokenAPI } from './AuthTokenAPI';
import CategoryAPI from './CategoryAPI';

const dataSources = () => ({
  postAPI: new PostAPI(),
  categoryAPI: new CategoryAPI(),
  mediaAPI: new MediaAPI(),
  commentAPI: new CommentAPI(),
  userAPI: new UserAPI(),
  reactionAPI: new ReactionAPI(),
  authTokenAPI: new AuthTokenAPI(),
});

export type DataSources = ReturnType<typeof dataSources>;

export default dataSources;
