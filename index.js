const FtpClient = require('ftp');
const xml2js = require('xml2js');
const fs = require('fs');




// Setup
const ftpClient = new FtpClient();
const parser = new xml2js.Parser();
const filePath = '/tmp/grababella.json';

// Run
ftpClient.connect({
	host: 'ftp.bom.gov.au'
});
ftpClient.on('ready', () => {
	console.log('connected');
	ftpClient.get('/anon/gen/fwo/IDV10450.xml', (err, stream) => {
		if (err) throw err;
		stream.once('close', () => ftpClient.end() );
        const chunks = [];
        stream.on('data', (chunk) => {
        	chunks.push(chunk.toString());
        });
		stream.on('end', () => {
        	const xmlData = chunks.join('');
        	// console.log('xml', xmlData);
        	// Convert to json
        	parser.parseString(xmlData, (err, data) => {
        		// console.log('js', JSON.stringify(data));

        		// Find melbourne metro
        		for (const area of data.product.forecast[0].area) {
        			if (area.$ 
        				&& area.$.aac === 'VIC_PT042' 
        				&& area.$.description === 'Melbourne') {
        				
        				// console.log('yo', JSON.stringify(area));

        				// Get first forecast period (today)
        				const forecastPeriod = area['forecast-period'][0]; // first one is today
        				// console.log('forecastPeriod', JSON.stringify(forecastPeriod));


        				// Parse data
        				let maxTemp = null;
        				let precipMin = null;
        				let precipMax = null;
        				let probabilityOfPrecip = null;
        				for (const elementEl of forecastPeriod.element) {
        					if (elementEl.$.type === 'precipitation_range') {
        						const prep = elementEl._.replace('mm', '').replace('  ', '');
        						const minMax = prep.split(' to ');
        						precipMin = minMax[0].trim();
        						precipMax = minMax[1].trim();
        						// FIXME: what happens if no rain? "0 mm" ?
        					}
        					if (elementEl.$.type === 'air_temperature_maximum') {
        						maxTemp = elementEl._;
        					}
        				}
        				for (const textEl of forecastPeriod.text) {
        					if (textEl.$.type === 'probability_of_precipitation') {
        						probabilityOfPrecip = textEl._.replace('%', '') / 100;
        					}
        				}

        				const info = {
                                                lastUpdated: (new Date()).toISOString(),
        					day: forecastPeriod.$['start-time-local'],
        					maxTemp: maxTemp,
        					precipMin: precipMin,
        					precipMax: precipMax,
        					probabilityOfPrecip: probabilityOfPrecip,
                                                debug: forecastPeriod, // debug
        				}
        				console.log('INFO', JSON.stringify(info));
        				fs.writeFileSync(filePath, JSON.stringify(info));
        				console.log('Done');
        			}

        		}
        	});
        });
	});
});