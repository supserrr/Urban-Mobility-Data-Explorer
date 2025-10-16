/**
 * Check for missing pickup or dropoff coordinates
 * Verifies data quality in the CSV
 */

const fs = require('fs');
const readline = require('readline');
const path = require('path');

async function checkMissingCoordinates() {
    const filePath = path.join(__dirname, '../data/raw/train.csv');
    
    let totalRecords = 0;
    let missingPickup = 0;
    let missingDropoff = 0;
    let missingBoth = 0;
    let complete = 0;
    let invalidCoords = 0;
    let missingRecords = [];
    
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let isHeader = true;
    let recordsToCheck = Infinity; // Check ALL records

    for await (const line of rl) {
        if (isHeader) {
            isHeader = false;
            continue;
        }
        
        if (totalRecords >= recordsToCheck) break;
        
        totalRecords++;
        
        const fields = line.split(',');
        
        // Fields: id, vendor_id, pickup_datetime, dropoff_datetime, passenger_count,
        //         pickup_longitude(5), pickup_latitude(6), dropoff_longitude(7), dropoff_latitude(8)
        const pickupLon = fields[5];
        const pickupLat = fields[6];
        const dropoffLon = fields[7];
        const dropoffLat = fields[8];
        
        const hasPickup = pickupLon && pickupLat && pickupLon.trim() !== '' && pickupLat.trim() !== '';
        const hasDropoff = dropoffLon && dropoffLat && dropoffLon.trim() !== '' && dropoffLat.trim() !== '';
        
        // Check if coordinates are valid numbers
        const pickupValid = hasPickup && !isNaN(parseFloat(pickupLon)) && !isNaN(parseFloat(pickupLat));
        const dropoffValid = hasDropoff && !isNaN(parseFloat(dropoffLon)) && !isNaN(parseFloat(dropoffLat));
        
        if (!pickupValid && !dropoffValid) {
            missingBoth++;
            if (missingRecords.length < 20) {
                missingRecords.push({ line: totalRecords, type: 'both', id: fields[0] });
            }
        } else if (!pickupValid) {
            missingPickup++;
            if (missingRecords.length < 20) {
                missingRecords.push({ line: totalRecords, type: 'pickup', id: fields[0], dropoff: `${dropoffLat}, ${dropoffLon}` });
            }
        } else if (!dropoffValid) {
            missingDropoff++;
            if (missingRecords.length < 20) {
                missingRecords.push({ line: totalRecords, type: 'dropoff', id: fields[0], pickup: `${pickupLat}, ${pickupLon}` });
            }
        } else {
            complete++;
        }
        
        if ((hasPickup && !pickupValid) || (hasDropoff && !dropoffValid)) {
            invalidCoords++;
        }
        
        // Show progress every 10k records
        if (totalRecords % 10000 === 0) {
            console.log(`Progress: ${totalRecords.toLocaleString()} records checked...`);
        }
    }

    console.log('\n' + '='.repeat(80));
    console.log('MISSING COORDINATE ANALYSIS');
    console.log('='.repeat(80));
    console.log(`Total records analyzed: ${totalRecords.toLocaleString()}`);
    console.log('');
    console.log('Results:');
    console.log(`   Complete records (both pickup & dropoff):  ${complete.toLocaleString()} (${((complete / totalRecords) * 100).toFixed(2)}%)`);
    console.log(`   Missing pickup coordinates:                ${missingPickup.toLocaleString()} (${((missingPickup / totalRecords) * 100).toFixed(4)}%)`);
    console.log(`   Missing dropoff coordinates:               ${missingDropoff.toLocaleString()} (${((missingDropoff / totalRecords) * 100).toFixed(4)}%)`);
    console.log(`   Missing both coordinates:                  ${missingBoth.toLocaleString()} (${((missingBoth / totalRecords) * 100).toFixed(4)}%)`);
    console.log(`  ️  Invalid coordinate values:                ${invalidCoords.toLocaleString()}`);
    console.log('');
    console.log('Summary:');
    console.log(`  Total missing: ${(missingPickup + missingDropoff + missingBoth).toLocaleString()}`);
    console.log(`  Data completeness: ${((complete / totalRecords) * 100).toFixed(2)}%`);
    console.log('='.repeat(80));
    console.log('');
    
    if (missingPickup === 0 && missingDropoff === 0 && missingBoth === 0) {
        console.log(' VERIFIED: All records have both pickup AND dropoff coordinates!');
        console.log(' Pickups = Dropoffs = Total Trips');
    } else {
        console.log('️  WARNING: Some records are missing coordinates!');
        console.log('️  Pickups might NOT equal Dropoffs in visualizations!');
        console.log('');
        console.log('Sample missing records:');
        missingRecords.forEach(rec => {
            console.log(`  Line ${rec.line}: ${rec.type} missing - ID: ${rec.id}`);
            if (rec.pickup) console.log(`    Has pickup: ${rec.pickup}`);
            if (rec.dropoff) console.log(`    Has dropoff: ${rec.dropoff}`);
        });
    }
}

// Run the check
checkMissingCoordinates()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
