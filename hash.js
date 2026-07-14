const bcrypt = require('bcryptjs');

const plainPassword = 'Gitam@123';

const hash = bcrypt.hashSync(plainPassword, 10);
console.log('Bcrypt hash:');
console.log(hash);
console.log('Length:', hash.length);