const TURBEST_PRIMARY = '#20808D';

module.exports = source => source
    .toString()
    .replace(/#00c3ff/gi, TURBEST_PRIMARY);

module.exports.raw = true;
