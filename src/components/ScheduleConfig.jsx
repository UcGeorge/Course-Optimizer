
import React, { useRef } from 'react';
import { DAYS_OF_WEEK } from '../utils/scheduler';

const ScheduleConfig = ({ courses, setCourses, dayLimits, setDayLimits, marginOfError, setMarginOfError, startDate, setStartDate }) => {

    const fileInputRef = useRef(null);

    const handleLimitChange = (day, value) => {
        setDayLimits(prev => ({ ...prev, [day]: parseInt(value) || 0 }));
    };

    // Format date for value prop (YYYY-MM-DD)
    const dateValue = startDate ? startDate.toISOString().split('T')[0] : '';

    // Data Management

    const exportData = () => {
        const data = {
            courses,
            dayLimits,
            marginOfError,
            startDate: startDate ? startDate.toISOString() : null
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `course_optimizer_data_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const triggerImport = () => {
        fileInputRef.current.click();
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);

                if (window.confirm("WARNING: Importing data will overwrite your current schedule. Are you sure?")) {
                    // Update all state
                    if (data.courses) setCourses(data.courses);
                    if (data.dayLimits) setDayLimits(data.dayLimits);
                    if (data.marginOfError) setMarginOfError(data.marginOfError);

                    if (data.startDate) {
                        const parsedDate = new Date(data.startDate);
                        // Validate date before setting to avoid crash
                        if (!isNaN(parsedDate.getTime())) {
                            setStartDate(parsedDate);
                        }
                    }
                }
            } catch (err) {
                alert("Failed to parse JSON file or invalid data.");
                console.error(err);
            } finally {
                // Always reset input to allow selecting same file again
                e.target.value = null;
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="card">
            <h2>Schedule Settings</h2>

            <div className="setting-group">
                <label>Data Management</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem' }}>
                    <button onClick={exportData} className="premium-btn" style={{ flex: 1, fontSize: '0.8rem' }}>⬇ Export Data</button>
                    <button onClick={triggerImport} className="premium-btn" style={{ flex: 1, fontSize: '0.8rem', background: 'var(--bg_secondary)' }}>⬆ Import Data</button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        accept=".json"
                        onChange={handleFileUpload}
                    />
                </div>
            </div>

            <div className="setting-group">
                <label>Start Date</label>
                <input
                    type="date"
                    value={dateValue}
                    onChange={(e) => setStartDate(new Date(e.target.value))}
                    className="premium-input full-width"
                />
            </div>

            <div className="setting-group">
                <label>Margin of Error (minutes)</label>
                <input
                    type="number"
                    value={marginOfError}
                    onChange={(e) => setMarginOfError(parseInt(e.target.value) || 0)}
                    className="premium-input full-width"
                />
                <small>Allow sections to overflow daily limit by this amount if needed.</small>
            </div>

            <h3>Daily Study Limits (minutes)</h3>
            <div className="days-grid">
                {DAYS_OF_WEEK.map(day => (
                    <div key={day} className="day-input">
                        <label>{day.toUpperCase()}</label>
                        <input
                            type="number"
                            value={dayLimits[day]}
                            onChange={(e) => handleLimitChange(day, e.target.value)}
                            className="premium-input"
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ScheduleConfig;
