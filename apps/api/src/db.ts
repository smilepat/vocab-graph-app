import neo4j, { Driver, Session } from 'neo4j-driver';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
const user = process.env.NEO4J_USER || 'neo4j';
const password = process.env.NEO4J_PASSWORD || 'password';

let driver: Driver | null = null;
let isConnected = false;

export const initDriver = async () => {
    try {
        const tempDriver = neo4j.driver(uri, neo4j.auth.basic(user, password));
        const serverInfo = await tempDriver.getServerInfo();
        driver = tempDriver;
        isConnected = true;
        console.log('Neo4j connection established');
        console.log(serverInfo);
    } catch (err) {
        console.error(`Neo4j connection error: ${err}`);
        console.log('Running without Neo4j - CSV-based quiz will be used');
        driver = null;
        isConnected = false;
    }
};

export const getDriver = (): Driver | null => {
    return isConnected ? driver : null;
};

export const closeDriver = async () => {
    if (driver) {
        await driver.close();
    }
};
