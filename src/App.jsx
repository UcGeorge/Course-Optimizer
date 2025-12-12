
import React, { useState, useEffect, useMemo } from 'react';
import UsageGuide from './components/UsageGuide';
import CourseManager from './components/CourseManager';
import ScheduleConfig from './components/ScheduleConfig';
import Dashboard from './components/Dashboard';
import { calculateSchedule } from './utils/scheduler';


function App() {
    const [courses, setCourses] = useState(() => {
        const saved = localStorage.getItem('co_courses');
        return saved ? JSON.parse(saved) : [];
    });

    const [dayLimits, setDayLimits] = useState(() => {
        const saved = localStorage.getItem('co_dayLimits');
        return saved ? JSON.parse(saved) : {
            mon: 120, tue: 120, wed: 120, thu: 120, fri: 120, sat: 240, sun: 240
        };
    });

    const [marginOfError, setMarginOfError] = useState(() => {
        const saved = localStorage.getItem('co_margin');
        return saved ? JSON.parse(saved) : 15;
    });

    const [startDate, setStartDate] = useState(() => {
        const saved = localStorage.getItem('co_startDate');
        return saved ? new Date(saved) : new Date();
    });

    useEffect(() => {
        localStorage.setItem('co_courses', JSON.stringify(courses));
    }, [courses]);

    useEffect(() => {
        localStorage.setItem('co_dayLimits', JSON.stringify(dayLimits));
    }, [dayLimits]);

    useEffect(() => {
        localStorage.setItem('co_margin', JSON.stringify(marginOfError));
    }, [marginOfError]);

    useEffect(() => {
        localStorage.setItem('co_startDate', startDate.toISOString());
    }, [startDate]);

    const schedule = useMemo(() => {
        return calculateSchedule(courses, dayLimits, marginOfError, 'mon', startDate);
    }, [courses, dayLimits, marginOfError, startDate]);

    return (
        <div className="app-container">
            <header className="main-header">
                <div className="header-content">
                    <div>
                        <h1>CourseOptimizer <span className="highlight">Pro</span></h1>
                        <p>Master your study schedule with precision.</p>
                    </div>
                    <UsageGuide />
                </div>
            </header>

            <main className="main-grid">
                <div className="sidebar">
                    <CourseManager courses={courses} setCourses={setCourses} />
                    <ScheduleConfig
                        courses={courses}
                        setCourses={setCourses}
                        dayLimits={dayLimits}
                        setDayLimits={setDayLimits}
                        marginOfError={marginOfError}
                        setMarginOfError={setMarginOfError}
                        startDate={startDate}
                        setStartDate={setStartDate}
                    />
                </div>

                <div className="content-area">
                    <Dashboard
                        courses={courses}
                        schedule={schedule}
                        totalDays={schedule.length}
                    />
                </div>
            </main>
        </div>
    );
}

export default App;
