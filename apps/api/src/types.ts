
export interface CsvRow {
    Word: string;
    'Parts of Speech': string;
    'Korean\nDefinition': string; // Note: CSV header often has newlines directly in it if not careful, but csv-parser keys usually trim or we map them.
    'English\nDefinition': string;
    'Example Sentence (Simple Complete Sentence)': string;
    'Synonyms/Antonyms': string;
    'CEFR/Grade': string;
    // Add other fields as needed
}

export interface ImportStats {
    created: number;
    errors: number;
    skipped: number;
}
