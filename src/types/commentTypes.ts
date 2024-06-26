import React from "react";

export interface Comment {
    author: string;
    likes: number;
    viewLikes: string;
    likeAction?: string;
    content: string;
    published: string;
    publishedDate: number;
    authorAvatarUrl: string;
    isAuthorContentCreator: boolean;
    authorChannelId: string;
    replyCount: number;
    commentId: string;
    commentParentId?: string;
    replyLevel: number;
    isDonated?: boolean;
    donationAmount?: string;
    isHearted?: boolean;
    isMember?: boolean;
    authorBadgeUrl?: string;
    authorMemberSince?: string;
    hasTimestamp: boolean;
    hasLinks: boolean;
    videoTitle?: string;
    videoId?: string;
    bookmarkAddedDate?: string;
    showRepliesDefault?: boolean;
    note?: string;
}

export interface CommentActionsProps {
    comment: Comment;
    commentId: string;
    replyCount: number;
    showReplies: boolean;
    setShowReplies: (show: boolean) => void;
    handleCopyToClipboard: () => void;
    copySuccess: boolean;
    showRepliesDefault?: boolean;
}

export interface CommentContentProps {
    content: string;
    handleTimestampClick: (event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => void;
}

export interface CommentHeaderProps {
    comment: Comment;
}

export interface CommentItemProps {
    comment: Comment;
    className?: string;
    replies?: Comment[];
    bgColor?: string;
    darkBgColor?: string;
    borderColor?: string;
    darkBorderColor?: string;
    videoTitle?: string;
    videoThumbnailUrl?: string;
    showRepliesDefault?: boolean;
}

export interface CommentListProps {
    comments: Comment[];
    isLoading: boolean;
}

export interface CommentRepliesProps {
    replies: Comment[];
    showReplies: boolean;
    repliesRef: React.RefObject<HTMLDivElement>;
    repliesHeight: string;
} // Define the type for the data structure returned by fetchCommentJsonDataFromRemote
export interface CommentData {
    onResponseReceivedEndpoints?: Array<{
        appendContinuationItemsAction?: {
            continuationItems?: Array<{
                continuationItemRenderer?: {
                    continuationEndpoint?: {
                        continuationCommand?: {
                            token?: string;
                        }
                    }
                }
            }>
        },
        reloadContinuationItemsCommand?: {
            continuationItems?: Array<{
                continuationItemRenderer?: {
                    continuationEndpoint?: {
                        continuationCommand?: {
                            token?: string;
                        }
                    }
                }
            }>
        }
    }>
} // Define a type for the content item structure
export interface ContentItem {
    itemSectionRenderer?: {
        contents?: Array<{
            continuationItemRenderer?: {
                continuationEndpoint?: {
                    continuationCommand?: {
                        token?: string;
                    }
                }
            }
        }>
        header?: Array<{
            commentsHeaderRenderer?: {
                sortMenu?: {
                    sortFilterSubMenuRenderer?: {
                        subMenuItems?: Array<{
                            serviceEndpoint?: {
                                continuationCommand?: {
                                    token?: string;
                                }
                            }
                        }>
                    }
                }
            }
        }>
    }
}
