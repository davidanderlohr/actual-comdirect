let api = require('@actual-app/api');
let dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { Readable } = require('stream');
const csv = require('csv-parser');

require('dotenv').config();

const regex = /(?:Empfänger|Auftraggeber):\s*(.*?)(?=\s+(?:Ref\.|Kto\/IBAN:|Buchungstext:))/g;


// Exportable function for importing CSV (for CLI and web UI)
async function importCsvToActual(csvPath, passwordOverride) {
  await api.init({
    dataDir: './cache',
    serverURL: process.env.ACTUAL_SERVER_URL || 'http://localhost:5006',
    password: passwordOverride || 'password',
  });
  await api.downloadBudget(process.env.ACTUAL_SYNC_ID || 'your-sync-id');
  const { parseCsvBySections } = require('./csv.js');
  const sections = await parseCsvBySections(csvPath);
  let giro_id = process.env.GIRO_ID || 'your-girokonto-id';
  let tagesgeld_id = process.env.TAGESGELD_ID || 'your-tagesgeld-id';
  let depot_id = process.env.DEPOT_ID || 'your-depot-id';
  for (const section of sections) {
    let accountId;
    if ((section.title).includes("Girokonto")) {
        accountId = giro_id;
    } else if ((section.title).includes("Tagesgeld")) {
        accountId = tagesgeld_id;
    } else {
        accountId = depot_id;
    }
    let transactions = [];
    for (const entryId in section.entries) {
        let entry = section.entries[entryId];
        if(entry['Buchungstag'] === 'offen') {
            continue;
        }
        let text;
        if (entry['Buchungstext']) {
            text = entry['Buchungstext'];
        } else {
            text = entry['Stück / Nom.'] + " x " + entry['Bezeichnung'] + '(' + entry['WKN'] + ' @ ' + entry['Ausführungskurs'] + ' ' + entry['Währung'] + ')';
        }
        let dateString = entry['Buchungstag'];
        let [day, month, year] = dateString.split('.');
        let date = new Date(`${year}-${month}-${day}`);
        date = date.toISOString().slice(0, 10);
        var euro_string = entry['Umsatz in EUR'];
        euro_string_clean = euro_string.replace('.', '').replace(',', '.');
        let amount = api.utils.amountToInteger(parseFloat(euro_string_clean));
        let notes = text;
        let imported_id = text + ' ' + date;
        let match;
        const parties = [];

        while ((match = regex.exec(text)) !== null) {
          parties.push(match[1].trim());
        }
        if (parties.length > 0) {
          imported_payee = parties[0];
        } else {
          imported_payee = text;
        }
        let transaction = {
            account: accountId,
            date: date,
            amount: amount,
            notes: notes,
            imported_payee: imported_payee,            
            imported_id: imported_id,
        }
        transactions.push(transaction);
    }
    await api.importTransactions(accountId, transactions);
  }
  await api.shutdown();
}

// Only run main if called directly (not required by server.js)
if (require.main === module) {
  (async () => {
    const csvPath = path.join(__dirname, 'test.csv');
    await importCsvToActual(csvPath);
  })().catch((err) => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });
}

module.exports = { importCsvToActual };