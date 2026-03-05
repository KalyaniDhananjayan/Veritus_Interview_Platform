const axios = require('axios');
require('dotenv').config();

async function evaluateDescriptive(data) {
    try {
        const response = await axios.post(
            process.env.AI_SERVICE_URL + '/evaluate',
            data
        );

        return response.data;
    } catch (error) {
        console.error('AI Service Error:', error.message);
        throw error;
    }
}

module.exports = { evaluateDescriptive };