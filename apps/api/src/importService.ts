import fs from 'fs';
import csv from 'csv-parser';
import { getDriver } from './db';
import { CsvRow, ImportStats } from './types';

// Helper to normalize keys because CSV headers might have newlines or spaces
const normalizeKey = (key: string) => key.replace(/\n/g, ' ').trim();

export const importCsvData = async (filePath: string): Promise<ImportStats> => {
    const stats: ImportStats = { created: 0, errors: 0, skipped: 0 };
    const driver = getDriver();

    if (!driver) {
        console.error('Driver not initialized');
        return stats;
    }

    const results: any[] = [];

    return new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(csv({
                mapHeaders: ({ header }) => normalizeKey(header)
            }))
            .on('data', (data) => results.push(data))
            .on('end', async () => {
                const session = driver.session();
                try {
                    console.log(`Processing ${results.length} rows...`);

                    for (const row of results) {
                        try {
                            // 1. Validate mandatory fields
                            if (!row['Word']) {
                                stats.skipped++;
                                continue;
                            }

                            const word = row['Word'].trim();
                            const pos = row['Parts of Speech']?.trim() || 'Urknown';
                            const koDef = row['Korean Definition']?.trim() || '';
                            const enDef = row['English Definition']?.trim() || '';
                            const example = row['Example Sentence (Simple Complete Sentence)']?.trim() || '';
                            const synonymsStr = row['Synonyms/Antonyms']?.trim() || '';
                            const cefr = row['CEFR/Grade']?.trim() || '';

                            // 2. Cypher Query
                            // We use MERGE to be idempotent
                            // Structure:
                            // (w:Word)
                            // (s:Sense) linked to w
                            // (e:Example) linked to s
                            // Note: We are simplifying by assuming one row = one Sense logic for now as per "flattened" CSV structure commonly found.

                            await session.run(`
                MERGE (w:Word {lemma: $word})
                ON CREATE SET w.pos = $pos, w.cefr = $cefr
                ON MATCH SET w.pos = $pos, w.cefr = $cefr
                
                MERGE (s:Sense {id: $word + '_sense_' + $koDef}) 
                SET s.definition_ko = $koDef, s.definition_en = $enDef
                
                MERGE (w)-[:HAS_SENSE]->(s)
                
                WITH w, s
                WHERE $example <> ''
                MERGE (e:Example {text: $example})
                MERGE (s)-[:HAS_EXAMPLE]->(e)
              `, {
                                word, pos, cefr, koDef, enDef, example
                            });

                            // 3. Handle Synonyms (Comma separated?)
                            // Example: "happy, joyful"
                            if (synonymsStr) {
                                const synonyms = synonymsStr.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
                                for (const syn of synonyms) {
                                    // We only create the relationship if the other word exists? 
                                    // Or we create a placeholder node? 
                                    // Strategy: Create/Merge the target node to ensure graph connectivity.
                                    await session.run(`
                     MATCH (w:Word {lemma: $word})
                     MERGE (t:Word {lemma: $syn})
                     MERGE (w)-[:RELATED_TO {type: 'synonym'}]->(t)
                   `, { word, syn });
                                }
                            }

                            stats.created++;
                        } catch (err) {
                            console.error(`Error processing row for word ${row['Word']}:`, err);
                            stats.errors++;
                        }
                    }
                } catch (err) {
                    console.error('Batch transaction error:', err);
                    reject(err);
                } finally {
                    await session.close();
                    resolve(stats);
                }
            });
    });
};
