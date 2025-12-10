const ContactDiscovery = {
    start: function () {
        var _a;
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const statusCell = (_a = ss.getSheetByName(CONFIG.SHEETS.CONTROL)) === null || _a === void 0 ? void 0 : _a.getRange('D21');
        const qSheet = ss.getSheetByName(CONFIG.SHEETS.QUALIFIED);
        if (!qSheet)
            return;
        try {
            statusCell === null || statusCell === void 0 ? void 0 : statusCell.setValue('🔍 Finding Qualified Companies...');
            // 1. Get Candidates
            // Logic: Status = 'YES' AND Contact Status is NOT 'DOWNLOADED' or 'SENT_TO_ROBOT'
            const data = qSheet.getDataRange().getValues();
            const BATCH_SIZE = 50;
            const candidates = [];
            for (let i = 1; i < data.length; i++) {
                const row = data[i];
                const qualStatus = String(row[4]).toUpperCase(); // Col E
                const contactStatus = String(row[5]).toUpperCase(); // Col F
                if (qualStatus === 'YES' &&
                    contactStatus !== 'DOWNLOADED' &&
                    contactStatus !== 'SENT_TO_ROBOT') {
                    candidates.push({ domain: row[0], rowIndex: i + 1 });
                }
                if (candidates.length >= BATCH_SIZE)
                    break;
            }
            if (candidates.length === 0) {
                statusCell === null || statusCell === void 0 ? void 0 : statusCell.setValue('✅ All Qualified Companies Processed');
                return;
            }
            // 2. Send to Robot
            statusCell === null || statusCell === void 0 ? void 0 : statusCell.setValue(`🤖 Sending ${candidates.length} domains to Robot...`);
            const domainList = candidates.map(c => c.domain);
            // Update & Restart Robot (REPLACE mode)
            ApiClient.updateAndRestartRobot(domainList);
            // 3. Mark Rows as SENT
            candidates.forEach(item => {
                qSheet.getRange(item.rowIndex, 6).setValue('SENT_TO_ROBOT');
            });
            // 4. Start Polling
            JobManager.startJob('contact_discovery_robot', String(CONFIG.LEADSPICKER.ROBOT_ID));
            statusCell === null || statusCell === void 0 ? void 0 : statusCell.setValue('⏳ Robot Running (Check back later)...');
        }
        catch (e) {
            console.error(e);
            statusCell === null || statusCell === void 0 ? void 0 : statusCell.setValue(`❌ Error: ${e.message}`);
            SpreadsheetApp.getUi().alert(e.message);
        }
    }
};
