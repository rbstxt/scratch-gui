const UNSAND_PRIMARY = '#20808D';

module.exports = source => source
    .toString()
    .replace(/#00c3ff/gi, UNSAND_PRIMARY);

module.exports.raw = true;
