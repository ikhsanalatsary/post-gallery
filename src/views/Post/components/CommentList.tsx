import React from 'react';
import { List, RootRef } from '@material-ui/core';
import { gql } from '@apollo/client';
import CommentListItem, {
  CommentListItemFragments,
  CommentListItemProps,
} from './CommentListItem';
import {
  CommentList_CommentEdgeFragment,
  CommentList_PageInfoFragment,
  Maybe,
} from '@src/generated/graphql';
import Loading from '@src/components/Loading';
import useInfiniteScroll from 'react-infinite-scroll-hook';

export const CommentListFragments = {
  commentEdge: gql`
    fragment CommentList_commentEdge on CommentEdge {
      cursor
      node {
        ...CommentListItem_comment
      }
    }
    ${CommentListItemFragments.comment}
  `,
  pageInfo: gql`
    fragment CommentList_pageInfo on PageInfo {
      hasNextPage
    }
  `,
};

export interface CommentListProps {
  edges: CommentList_CommentEdgeFragment[];
  pageInfo: CommentList_PageInfoFragment;
  loading: boolean;
  error: Maybe<Error>;
  onFetchMore: VoidFunction;
  updateAfterDelete: CommentListItemProps['updateAfterDelete'];
}

const CommentList = React.memo<CommentListProps>(function CommentList({
  edges,
  pageInfo,
  loading,
  error,
  onFetchMore,
  updateAfterDelete,
}) {
  const { hasNextPage } = pageInfo;
  const infiniteRef = useInfiniteScroll({
    hasNextPage: !error && hasNextPage,
    loading,
    onLoadMore: onFetchMore,
  });

  return (
    <RootRef rootRef={infiniteRef}>
      <List>
        {edges.map((edge) => {
          return (
            <CommentListItem
              key={edge.cursor}
              comment={edge.node}
              updateAfterDelete={updateAfterDelete}
            />
          );
        })}
        {hasNextPage && <Loading />}
      </List>
    </RootRef>
  );
});

export default CommentList;
