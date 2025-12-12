import React from 'react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const COLORS = [
    'linear-gradient(135deg, #FF6B6B 0%, #EE5D5D 100%)',
    'linear-gradient(135deg, #4ECDC4 0%, #45B7D1 100%)',
    'linear-gradient(135deg, #A8E6CF 0%, #34D399 100%)',
    'linear-gradient(135deg, #FFA07A 0%, #FF8C61 100%)',
    'linear-gradient(135deg, #BB8FCE 0%, #9B59B6 100%)',
    'linear-gradient(135deg, #F7DC6F 0%, #F1C40F 100%)',
    'linear-gradient(135deg, #85C1E9 0%, #3498DB 100%)',
    'linear-gradient(135deg, #E5989B 0%, #B5838D 100%)'
];

// Map gradient colors to solid hex for Excel export
const EXCEL_COLORS = [
    'EE5D5D', '45B7D1', '34D399', 'FF8C61', '9B59B6', 'F1C40F', '3498DB', 'B5838D'
];

const Dashboard = ({ schedule, totalDays, courses = [] }) => {
    if (!schedule || schedule.length === 0) {
        return <div className="card empty-state">Add courses to see your optimized schedule.</div>;
    }

    const exportToExcel = async () => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Study Schedule');

        // Header background colors
        const WEEK_COLORS = [
            'FF1F4E79', // Dark Blue
            'FF27603B', // Dark Green
            'FF7030A0', // Dark Purple
            'FF800000', // Dark Maroon
            'FF7F6000', // Dark Gold
            'FF385723'  // Olive
        ];

        // Pre-process schedule data for efficient lookup
        const courseMap = new Map(); 

        const updateDates = (currentObj, date) => {
            if (!currentObj.start) currentObj.start = date;
            currentObj.end = date; // Chronological iteration ensures this is the end date
        };

        schedule.forEach(day => {
            const dateObj = day.rawDate || new Date(day.date);

            day.sections.forEach(section => {
                if (!courseMap.has(section.courseName)) {
                    courseMap.set(section.courseName, {
                        activeDays: new Set(),
                        sections: new Set(),
                        sectionDays: new Map(), // Maps Label -> Set<DayIndex>
                        sectionDates: new Map(), // Maps Label -> { start, end }
                        start: null,
                        end: null,
                        colorIndex: section.colorIndex
                    });
                }
                const cData = courseMap.get(section.courseName);
                cData.activeDays.add(day.dayIndex);
                updateDates(cData, dateObj);

                // Normalize label (remove part suffix for grouping)
                let normLabel = section.sectionLabel.toString();
                normLabel = normLabel.replace(/\s*\(Part \d+\)$/, ''); 

                cData.sections.add(normLabel);

                if (!cData.sectionDays.has(normLabel)) {
                    cData.sectionDays.set(normLabel, new Set());
                }
                cData.sectionDays.get(normLabel).add(day.dayIndex);

                if (!cData.sectionDates.has(normLabel)) {
                    cData.sectionDates.set(normLabel, { start: null, end: null });
                }
                updateDates(cData.sectionDates.get(normLabel), dateObj);
            });
        });

        // Define columns and headers
        const totalDayCols = schedule.length;
        const colDefs = [
            { header: 'WBS', key: 'id', width: 8 },
            { header: 'Task / Item', key: 'task', width: 40 },
            { header: 'Start Date', key: 'startDate', width: 15 },
            { header: 'End Date', key: 'endDate', width: 15 },
            { header: 'Duration', key: 'duration', width: 10 },
            { header: '% Complete', key: 'pct', width: 12 }
        ];
        schedule.forEach(day => {
            colDefs.push({ header: '', key: `day_${day.dayIndex}`, width: 15 });
        });
        worksheet.columns = colDefs;

        // Initialize header rows
        const weekRow = worksheet.getRow(1);
        const dayRow = worksheet.getRow(2);

        // Merge static header cells
        worksheet.mergeCells('A1:A2');
        worksheet.mergeCells('B1:B2');
        worksheet.mergeCells('C1:C2');
        worksheet.mergeCells('D1:D2');
        worksheet.mergeCells('E1:E2');
        worksheet.mergeCells('F1:F2');

        weekRow.getCell(1).value = 'WBS';
        weekRow.getCell(2).value = 'Task / Item';
        weekRow.getCell(3).value = 'Start Date';
        weekRow.getCell(4).value = 'End Date';
        weekRow.getCell(5).value = 'Duration';
        weekRow.getCell(6).value = '% Complete';

        // Generate dynamic week headers
        const startDayIndex = 7; // G column (Index 7)
        let currentWeek = -1;
        let weekStartCol = startDayIndex;
        let weekColor = WEEK_COLORS[0];

        schedule.forEach((day, idx) => {
            const colIdx = startDayIndex + idx;
            const weekNum = Math.floor(idx / 7) + 1;

            // Handle week merging and colors
            if (weekNum !== currentWeek) {
                if (currentWeek !== -1) {
                    worksheet.mergeCells(1, weekStartCol, 1, colIdx - 1);
                }
                currentWeek = weekNum;
                weekStartCol = colIdx;
                weekColor = WEEK_COLORS[(weekNum - 1) % WEEK_COLORS.length];

                const weekCell = weekRow.getCell(colIdx);
                weekCell.value = `WEEK ${weekNum}`;
                weekCell.alignment = { horizontal: 'center', vertical: 'middle' };
                weekCell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
                weekCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: weekColor } };
            }

            // Populate Day Header
            // Apply week color to day header for visual grouping
            const dayCell = dayRow.getCell(colIdx);
            dayCell.value = `${day.dayName.toUpperCase()}\n${day.date}`;
            dayCell.alignment = { wrapText: true, horizontal: 'center', vertical: 'middle' };
            dayCell.fill = {
                type: 'pattern', pattern: 'solid', fgColor: { argb: weekColor }
            };
            dayCell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            dayCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' }, bottom: { style: 'medium' } };

            // Merge the final week block
            if (idx === schedule.length - 1) {
                worksheet.mergeCells(1, weekStartCol, 1, colIdx);
            }
        });

        // Style the static header block
        ['A1', 'B1', 'C1', 'D1', 'E1', 'F1'].forEach(key => {
            const cell = worksheet.getCell(key);
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2C3E50' } };
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });

        // Render course and section rows
        const dayStartLetter = worksheet.getColumn(startDayIndex).letter;
        const dayEndLetter = worksheet.getColumn(startDayIndex + schedule.length - 1).letter;

        courses.forEach((course, cIdx) => {
            const cData = courseMap.get(course.name);
            const courseColor = cData ? EXCEL_COLORS[cData.colorIndex % EXCEL_COLORS.length] : 'CCCCCC';

            const fmtDate = (d) => d ? d.toLocaleDateString() : '';

            // Render course parent row
            const parentRow = worksheet.addRow({
                id: cIdx + 1,
                task: course.name,
                startDate: cData ? fmtDate(cData.start) : '',
                endDate: cData ? fmtDate(cData.end) : '',
                duration: '',
                pct: 0
            });
            parentRow.font = { bold: true, size: 12 };
            parentRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };

            // Apply background color to active days in parent row
            if (cData) {
                cData.activeDays.forEach(dayIdx => {
                    const cell = parentRow.getCell(`day_${dayIdx}`);
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + courseColor } };
                    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' }, bottom: { style: 'thin' } };
                });
            }

            // Track total cells for course completion calculation
            let courseTotalCells = 0;
            const firstSectionRowIdx = parentRow.number + 1;

            // Render section rows
            course.sections.forEach((secDuration, sIdx) => {
                const sectionLabel = (sIdx + 1).toString();
                const sDates = cData && cData.sectionDates ? cData.sectionDates.get(sectionLabel) : null;

                const row = worksheet.addRow({
                    id: `${cIdx + 1}.${sIdx + 1}`,
                    task: `   Section ${sectionLabel}`,
                    startDate: sDates ? fmtDate(sDates.start) : '',
                    endDate: sDates ? fmtDate(sDates.end) : '',
                    duration: secDuration + 'm',
                    pct: 0
                });
                row.outlineLevel = 1;

                let sectionTotalCells = 0;

                if (cData && cData.sectionDays.has(sectionLabel)) {
                    const activeDays = cData.sectionDays.get(sectionLabel);
                    sectionTotalCells = activeDays.size;
                    courseTotalCells += sectionTotalCells;

                    activeDays.forEach(dayIdx => {
                        const cell = row.getCell(`day_${dayIdx}`);
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + courseColor } };
                        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' }, bottom: { style: 'thin' } };
                        cell.value = '';

                        // Add data validation (checkbox behavior)
                        cell.dataValidation = {
                            type: 'list',
                            allowBlank: true,
                            formulae: ['"✓"']
                        };
                        cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    });

                    // Set formula for section percentage
                    if (sectionTotalCells > 0) {
                        const range = `${dayStartLetter}${row.number}:${dayEndLetter}${row.number}`;
                        row.getCell('pct').value = {
                            formula: `COUNTIF(${range}, "✓")/${sectionTotalCells}`
                        };
                        row.getCell('pct').numFmt = '0%';
                    }
                }
            });

            // Set formula for course (parent) percentage
            const lastSectionRowIdx = parentRow.number + course.sections.length;
            if (courseTotalCells > 0) {
                const blockRange = `${dayStartLetter}${firstSectionRowIdx}:${dayEndLetter}${lastSectionRowIdx}`;
                parentRow.getCell('pct').value = {
                    formula: `COUNTIF(${blockRange}, "✓")/${courseTotalCells}`
                };
                parentRow.getCell('pct').numFmt = '0%';
            }
        });

        // Export workbook
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `CourseOptimizer_Schedule_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    return (
        <div className="card dashboard">
            <div className="dashboard-header">
                <h2>Study Plan</h2>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <button onClick={exportToExcel} className="premium-btn" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
                        📊 Export Excel Gantt
                    </button>
                    <div className="summary-badge">
                        End Date: <strong>{schedule[schedule.length - 1].date}</strong> ({totalDays} Days)
                    </div>
                </div>
            </div>

            <div className="gantt-chart">
                {schedule.map(day => (
                    <div key={day.dayIndex} className="gantt-row premium-row">
                        <div className="day-label">
                            <span className="day-name">{day.dayName.toUpperCase()}</span>
                            <span className="day-date">{day.date}</span>
                        </div>
                        <div className="day-timeline">
                            {day.sections.length === 0 && (
                                <div className="timeline-block empty-day">
                                    <span>Free Day</span>
                                </div>
                            )}
                            {day.sections.map((section, idx) => (
                                <div
                                    key={idx}
                                    className="timeline-block premium-block"
                                    style={{
                                        flex: section.duration,
                                        background: COLORS[section.colorIndex % COLORS.length]
                                    }}
                                    title={`${section.courseName} - ${section.sectionLabel} (${section.duration}m)`}
                                >
                                    <div className="block-content">
                                        <span className="block-title">{section.courseName}</span>
                                        <span className="block-label">{section.sectionLabel}</span>
                                        <span className="block-duration">{section.duration}m</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Dashboard;