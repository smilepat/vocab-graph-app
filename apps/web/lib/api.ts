import axios from 'axios';

const API_URL = 'http://localhost:3001';

export const searchWord = async (word: string) => {
    // Mock response for now, to be replaced with real backend call
    // We need to implement GET /search/:word in backend later
    return axios.get(`${API_URL}/search/${word}`);
};

export const getGraphData = async (seedWord: string) => {
    // Returns graph topology for a word
    // This will call a new endpoint like /graph/:word
    return axios.get(`${API_URL}/graph/${seedWord}`);
};
