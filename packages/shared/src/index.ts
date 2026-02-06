// Initial Shared Types

export interface Learner {
    id: string;
    level: string; // A1, A2, etc.
}

export interface Word {
    id: string; // The specific lemma key
    lemma: string;
    cefr: string;
}

export type RelationType =
    | 'HAS_SENSE'
    | 'HAS_EXAMPLE'
    | 'IN_TOPIC'
    | 'HAS_TAG'
    | 'RELATED_TO'
    | 'KNOWS'
    | 'LEARNING'
    | 'FORGOT';
