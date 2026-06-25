const mysql = require('mysql2');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    database: 'tech_support_bot',
    password: '',          // Если у XAMPP пароль пустой
    waitForConnections: true,
    connectionLimit: 10
});

const promisePool = pool.promise();

module.exports = promisePool;