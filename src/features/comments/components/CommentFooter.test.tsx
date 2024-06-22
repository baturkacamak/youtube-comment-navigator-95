import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CommentFooter from './CommentFooter';
import { CommentActionsProps } from "../../../types/commentTypes";
import { useTranslation } from 'react-i18next';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key })
}));

const mockProps: CommentActionsProps = {
    comment: {
        commentId: 'comment123',
        content: 'This is a sample comment',
        publishedDate: new Date('2024-06-14T12:00:00Z').getTime(), // Convert to timestamp
        published: '2024-06-14',
        likes: 10,
        viewLikes: "24k",
        replyCount: 2,
        isAuthorContentCreator: true,
        isDonated: true,
        donationAmount: '$10',
        isHearted: true,
        isMember: true,
        authorMemberSince: '2020',
        authorBadgeUrl: 'https://example.com/badge.png',
        authorChannelId: 'UC12345',
        authorAvatarUrl: 'https://example.com/avatar.png',
        author: 'John Doe',
        replyLevel: 0,
        hasTimestamp: false,
        hasLinks: false
    },
    commentId: 'comment123',
    replyCount: 5,
    showReplies: false,
    setShowReplies: jest.fn(),
    handleCopyToClipboard: jest.fn(),
    copySuccess: false
};

describe('CommentFooter', () => {
    it('renders the likes count', () => {
        render(<CommentFooter {...mockProps} />);
        expect(screen.getByLabelText('Likes')).toHaveTextContent('10');
    });

    it('renders the published date', () => {
        render(<CommentFooter {...mockProps} />);
        expect(screen.getByLabelText('Published date')).toHaveTextContent('2024-06-14');
    });

    it('shows copied state when copySuccess is true', () => {
        render(<CommentFooter {...mockProps} copySuccess={true} />);
        expect(screen.getByText('Copied')).toBeInTheDocument();
        expect(screen.queryByText('Copy')).not.toBeInTheDocument();
    });

    it('calls handleCopyToClipboard when copy button is clicked', () => {
        render(<CommentFooter {...mockProps} />);
        fireEvent.click(screen.getByLabelText('Copy to clipboard'));
        expect(mockProps.handleCopyToClipboard).toHaveBeenCalled();
    });

    it('toggles show replies on button click', () => {
        render(<CommentFooter {...mockProps} />);
        fireEvent.click(screen.getByLabelText('Show replies'));
        expect(mockProps.setShowReplies).toHaveBeenCalledWith(true);
    });

    it('displays creator badge if the comment author is the content creator', () => {
        render(<CommentFooter {...mockProps} />);
        expect(screen.getByText('Creator')).toBeInTheDocument();
    });

    it('displays donation amount if the comment has a donation', () => {
        render(<CommentFooter {...mockProps} />);
        expect(screen.getByLabelText('Donation amount')).toHaveTextContent('$10');
    });

    it('displays heart icon if the comment is hearted by the creator', () => {
        render(<CommentFooter {...mockProps} />);
        expect(screen.getByLabelText('Hearted by Creator')).toBeInTheDocument();
    });

    it('displays member badge if the comment author is a member', () => {
        render(<CommentFooter {...mockProps} />);
        expect(screen.getByAltText('Member Badge')).toBeInTheDocument();
    });

    it('links to the author\'s channel', () => {
        render(<CommentFooter {...mockProps} />);
        expect(screen.getByLabelText('Go to author\'s channel')).toHaveAttribute('href', 'https://www.youtube.com/channel/UC12345');
    });
});
