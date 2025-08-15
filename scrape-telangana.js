// scrape_telangana.js
// Install: npm install axios cheerio
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

(async () => {
  try {
    const url = 'https://vvp.telangana.gov.in/content.php?U=2';
    console.log('Fetching:', url);
    const { data } = await axios.get(url, { timeout: 20000 });
    const $ = cheerio.load(data);

    const hospitals = [];

    // Defaults taken from your "sample JSON" (super-specialty example)
    const defaultSpecialties = [
      'Cardiology',
      'Neurology',
      'Orthopedics',
      'Oncology',
      'Psychiatry',
      'Surgery',
      'Emergency Medicine',
      'Radiology',
      'Anesthesiology',
      'Urology'
    ];

    const defaultFacilities = [
      'Super Specialty Units',
      'Advanced Cardiac Center',
      'Cancer Treatment Center',
      'Organ Transplant Unit',
      'Advanced Imaging Center',
      'Clinical Research Unit'
    ];

    // Helper: determine if a text is a pure integer (beds)
    const isIntegerText = (t) => /^\d+$/.test((t || '').replace(/,/g, ''));

    // Iterate each row in all tables (some pages use many tables)
    $('table').each((ti, table) => {
      $(table).find('tr').each((ri, row) => {
        const $row = $(row);
        const tds = $row.find('td');

        if (!tds || tds.length === 0) return; // skip non-data rows

        // Gather texts in row (trimmed)
        const texts = tds.map((i, el) => $(el).text().replace(/\u00A0/g, ' ').trim()).get().filter(Boolean);

        // Skip header-like rows
        if (texts.some(t => /district|name of the hospital|total beds|sl\.?|sno|serial/i.test(t))) return;

        // Try attribute-width based extraction first (most reliable)
        const nameEl = tds.filter((i, el) => {
          const w = $(el).attr('width');
          return w && String(w).trim() === '198';
        }).first();

        const addressEl = tds.filter((i, el) => {
          const w = $(el).attr('width');
          return w && String(w).trim() === '229';
        }).first();

        const capacityEl = tds.filter((i, el) => {
          const w = $(el).attr('width');
          return w && String(w).trim() === '188';
        }).first();

        let name = nameEl && nameEl.length ? nameEl.text().trim() : null;
        let address = addressEl && addressEl.length ? addressEl.text().trim() : null;
        let capacityText = capacityEl && capacityEl.length ? capacityEl.text().trim() : null;

        // Fallbacks if width attrs are not present or returned empty:

        // 1) Capacity fallback: find first pure-integer cell in the row
        if (!capacityText) {
          const capCandidate = texts.find(t => isIntegerText(t));
          capacityText = capCandidate || null;
        }

        // 2) Address fallback: if absent, choose the shortest non-numeric text that is not likely the hospital name
        if (!address) {
          const nonNum = texts.filter(t => !isIntegerText(t));
          // if there's more than 1 non-numeric text, assume one of them is district:
          if (nonNum.length >= 2) {
            // choose the shortest one (districts are usually short like "Hyderabad", "Adilabad")
            address = nonNum.reduce((a, b) => (a.length <= b.length ? a : b), nonNum[0]);
          } else {
            address = nonNum[0] || '';
          }
        }

        // 3) Name fallback: prefer terms that match hospital keywords (DH, MCH, Hospital, CHC, RIMS, etc.)
        if (!name) {
          const keywordRegex = /\b(DH|MCH|Hospital|CHC|RIMS|General|Civil|District|UCHC|Area|Maternity|Women|Govt|Government|Super)\b/i;
          let candidate = texts.find(t => keywordRegex.test(t));
          if (!candidate) {
            // else choose the longest non-numeric text (often the full hospital name)
            const nonNum = texts.filter(t => !isIntegerText(t));
            candidate = nonNum.sort((a, b) => b.length - a.length)[0];
          }
          name = candidate || '';
        }

        // Normalize capacity to integer or null
        const capacity = capacityText ? parseInt(String(capacityText).replace(/,/g, ''), 10) : null;

        // final guard: don't add rows that clearly aren't hospital rows
        // (must have either a name or an address)
        if ((!name || name.length === 0) && (!address || address.length === 0)) return;

        // Avoid accidentally taking district as hospital name (common issue) 
        // - if name equals address, and there's another non-numeric longer text, prefer that longer text as name:
        if (String(name).trim().toLowerCase() === String(address).trim().toLowerCase()) {
          const otherCandidates = texts.filter(t => !isIntegerText(t) && t.trim().toLowerCase() !== address.trim().toLowerCase());
          if (otherCandidates.length) {
            // pick the longest different candidate
            name = otherCandidates.sort((a, b) => b.length - a.length)[0];
          }
        }

        // Build hospital object per your requested schema
        const hospitalObj = {
          name: name || address || null,
          type: 'government',
          address: address || null,        // district
          city: name || address || null,   // as requested: city = hospital name (fall back to address)
          state: 'Telangana',
          capacity: Number.isFinite(capacity) ? capacity : null,
          specialties: defaultSpecialties,
          facilities: defaultFacilities
        };

        hospitals.push(hospitalObj);
      });
    });

    // Save JSON file
    fs.writeFileSync('hospitals_tel.json', JSON.stringify(hospitals, null, 2), 'utf8');
    console.log(`✅ Scraped ${hospitals.length} hospitals. Data saved to hospitals_tel.json`);

    // Print first 5 for quick verification
    console.log('Sample (first 5):', hospitals.slice(0, 5));

  } catch (err) {
    console.error('❌ Error scraping:', err && err.message ? err.message : err);
  }
})();
