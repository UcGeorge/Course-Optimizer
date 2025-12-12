import React, { useState } from 'react';

const UsageGuide = () => {
    const [isOpen, setIsOpen] = useState(false);

    const toggle = () => setIsOpen(!isOpen);

    return (
        <div className="usage-guide-container">
            <button className="guide-toggle-btn" onClick={toggle} title="How to use">
                {isOpen ? 'Close Guide' : 'Need Help?'}
            </button>

            {isOpen && (
                <div className="guide-card">
                    <h3>🚀 Quick Start Guide</h3>
                    <div className="guide-step">
                        <span className="step-num">1</span>
                        <div className="step-content">
                            <h4>Add Your Courses</h4>
                            <p>Enter the course name and the duration of each video/section in minutes (e.g., "120, 45, 90"). The system needs this raw data to build your plan.</p>
                        </div>
                    </div>

                    <div className="guide-step">
                        <span className="step-num">2</span>
                        <div className="step-content">
                            <h4>Configure Limits</h4>
                            <p>Set how many minutes you can study each day (e.g., Mon: 120m). The "Schedule Config" box lets you tailor this to your real-life availability.</p>
                        </div>
                    </div>

                    <div className="guide-step">
                        <span className="step-num">3</span>
                        <div className="step-content">
                            <h4>Export to Excel</h4>
                            <p>Once you see your optimal timeline, click <strong>"Export Excel Gantt"</strong>. This downloads a powerful tracking spreadsheet.</p>
                        </div>
                    </div>

                    <div className="guide-step">
                        <span className="step-num">4</span>
                        <div className="step-content">
                            <h4>Track Progress</h4>
                            <p>Open the Excel file. As you finish tasks, select <strong>"✓"</strong> in the colored timeline cells. The <strong>% Complete</strong> column will update automatically!</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UsageGuide;
