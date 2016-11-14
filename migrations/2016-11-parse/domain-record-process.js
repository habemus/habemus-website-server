const domainRecords = require('./raw-data/DomainRecordProcessed.json').results;

domainRecords.forEach((record) => {
  delete record.statusChecks_;
});

console.log(JSON.stringify(domainRecords, null, '\t'));
