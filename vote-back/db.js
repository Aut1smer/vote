//dp数据库系统
const DataBase = require('better-sqlite3')
const db = new DataBase(__dirname + '/voteTest.sqlite3')
// console.log(__dirname, '\r\n', __filename);

module.exports = db