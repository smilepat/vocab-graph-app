import neo4j, { Driver, Session } from 'neo4j-driver';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
const user = process.env.NEO4J_USER || 'neo4j';
const password = process.env.NEO4J_PASSWORD || 'password';

let driver: Driver;

export const initDriver = async () => {
    try {
        driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
        const serverInfo = await driver.getServerInfo();
        console.log('Connection established');
        console.log(serverInfo);
    } catch (err) {
        console.error(`Connection error: ${err}`);
    }
};

export const getDriver = (): Driver => {
    return driver;
};

export const closeDriver = async () => {
    if (driver) {
        await driver.close();
    }
};
