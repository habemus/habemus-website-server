const domainRecords = require('./raw-data/DomainRecord.json').results;

domainRecords.forEach((record) => {
  delete record.statusChecks_;
});

// console.log(domainRecords.map((record) => {
//   return record.hostname;
// }))

console.log(JSON.stringify(domainRecords, null, '\t'));
