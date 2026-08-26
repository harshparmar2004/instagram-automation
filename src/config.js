require('dotenv').config();

module.exports = {
    PORT: process.env.PORT || 3000,
    DASHBOARD_PASSWORD: process.env.DASHBOARD_PASSWORD || 'changeme',
    BASE_URL: process.env.BASE_URL || 'http://localhost:3000'
};
