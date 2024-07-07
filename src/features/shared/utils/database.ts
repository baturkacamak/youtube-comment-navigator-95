import Dexie from 'dexie';

export const DEFAULT_CACHE_EXPIRATION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

interface Comment {
    key: string;
    data: any;
    timestamp?: number;
}

class CommentsDatabase extends Dexie {
    comments: Dexie.Table<Comment, string>;

    constructor() {
        super('commentsCacheDB');
        this.version(1).stores({
            comments: 'key, data, timestamp'
        });
        this.comments = this.table('comments');
    }
}

export const db = new CommentsDatabase();
