const { query } = require('express');
let mysql = require('sync-mysql');

let base = new mysql({
    host     : 'localhost',
    user     : 'root',
    password : 'root',
    database : 'data_collection'
});

let template_data;

module.exports.init =  function() {
    base.query(
        `CREATE TABLE IF NOT EXISTS counters (
            id       INTEGER AUTO_INCREMENT PRIMARY KEY NOT NULL,
            name     VARCHAR(64),
            resource VARCHAR(64)
        )`
    );
    base.query(
        `CREATE TABLE IF NOT EXISTS records (
            id INTEGER AUTO_INCREMENT PRIMARY KEY NOT NULL,
            user VARCHAR(64)
        )`
    );
    base.query(
        `CREATE TABLE IF NOT EXISTS record_values (
            record_id  INTEGER NOT NULL,
            counter_id INTEGER NOT NULL,
            value      VARCHAR(64)
        )`
    )
};

module.exports.init_template = function(template) {
    if (base.query('SELECT count(*) FROM counters')[0]['count(*)'] != 0) {
        return;
    }
    template_data = template;
    for (let key of Object.keys(template)) {
        if ((key == 'name') || (key == 'resources')) continue;
        base.query(`INSERT INTO counters SET name = ?, resource = 'main'`, [key]);
    }
    for (let resource of template.resources) {
        for (let counter of Object.keys(resource)) {
            if (counter == 'name') continue;
            base.query(`INSERT INTO counters SET name = ?, resource = ?`, [counter, resource.name]);
        }
    }
}

module.exports.counters = function() {
    return base.query(`SELECT * FROM counters`);
}

module.exports.insert = function(values) {
    base.query(`INSERT INTO records SET user = 'root'`)
    record_id = base.query(`SELECT LAST_INSERT_ID()`)[0]['LAST_INSERT_ID()'];
    for (let [key, value] of Object.entries(values)) {
        base.query(`INSERT INTO record_values SET record_id = ?, counter_id = ?, value = ?`, [record_id, key, value]);
    }
}

module.exports.read = function(user) {
    let result = [];
    let records = base.query(`SELECT id FROM records WHERE user = ?`, [user]);
    for (let record of records) {
        result.push(
            base.query(
                `SELECT value, name, resource
                    FROM record_values
                    INNER JOIN counters ON counter_id = counters.id
                    WHERE record_id = ?
                `, [record.id]
            )
        );
    }
    return result;
}