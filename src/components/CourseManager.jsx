
import React, { useState } from 'react';

const CourseManager = ({ courses, setCourses }) => {
    const [newCourseName, setNewCourseName] = useState('');

    // Manage adding a new course
    const addCourse = () => {
        if (!newCourseName.trim()) return;
        setCourses([...courses, { id: Date.now(), name: newCourseName, sections: [], startOffset: 0 }]);
        setNewCourseName('');
    };

    // Manage adding a section to a course
    const addSection = (courseId, duration) => {
        if (!duration || isNaN(parseInt(duration))) return;
        setCourses(courses.map(c => {
            if (c.id === courseId) {
                return { ...c, sections: [...c.sections, parseInt(duration)] };
            }
            return c;
        }));
    };

    // Update Offset
    const updateOffset = (courseId, offset) => {
        setCourses(courses.map(c => {
            if (c.id === courseId) {
                const val = parseInt(offset);
                // Ensure offset is valid (0 <= offset <= sections.length)
                const safeVal = Math.max(0, Math.min(val, c.sections.length));
                return { ...c, startOffset: safeVal };
            }
            return c;
        }));
    };

    // Remove a course
    const removeCourse = (courseId) => {
        setCourses(courses.filter(c => c.id !== courseId));
    };

    // Remove a section
    const removeSection = (courseId, sectionIndex) => {
        setCourses(courses.map(c => {
            if (c.id === courseId) {
                const newSections = [...c.sections];
                newSections.splice(sectionIndex, 1);
                // If we remove a section, ensure offset isn't out of bounds
                const newOffset = Math.min(c.startOffset, newSections.length);
                return { ...c, sections: newSections, startOffset: newOffset };
            }
            return c;
        }));
    };

    return (
        <div className="card">
            <h2>Courses</h2>
            <div className="input-group">
                <input
                    type="text"
                    value={newCourseName}
                    onChange={(e) => setNewCourseName(e.target.value)}
                    placeholder="New Course Name"
                    className="premium-input"
                    onKeyDown={(e) => e.key === 'Enter' && addCourse()}
                />
                <button onClick={addCourse} className="premium-btn">Add</button>
            </div>

            <div className="course-list">
                {courses.length === 0 && <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>No courses added yet.</p>}

                {courses.map(course => (
                    <div key={course.id} className="course-item">
                        <div className="course-header">
                            <div className="header-info">
                                <h3>{course.name}</h3>
                                <div className="offset-control">
                                    <label>Already Done:</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max={course.sections.length}
                                        value={course.startOffset || 0}
                                        onChange={(e) => updateOffset(course.id, e.target.value)}
                                        className="tiny-input"
                                    />
                                    <span>/ {course.sections.length}</span>
                                </div>
                            </div>
                            <button onClick={() => removeCourse(course.id)} className="icon-btn">×</button>
                        </div>
                        <div className="sections-list">
                            {course.sections.map((dur, idx) => {
                                const isDone = idx < (course.startOffset || 0);
                                return (
                                    <div key={idx} className={`section-tag ${isDone ? 'done' : ''}`}>
                                        {dur}m
                                        <span onClick={() => removeSection(course.id, idx)} className="remove-tag">×</span>
                                    </div>
                                )
                            })}
                            <SectionInput onAdd={(dur) => addSection(course.id, dur)} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Subcomponent for handling section input state locally
const SectionInput = ({ onAdd }) => {
    const [val, setVal] = useState('');

    const handleSubmit = () => {
        if (val) {
            onAdd(val);
            setVal('');
        }
    };

    return (
        <div className="add-section-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            <input
                type="number"
                placeholder="min"
                className="small-input"
                value={val}
                onChange={(e) => setVal(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        handleSubmit();
                    }
                }}
            />
            <button
                onClick={handleSubmit}
                className="icon-btn"
                style={{ fontSize: '1rem', color: 'var(--accent-color)', fontWeight: 'bold' }}
                title="Add Section"
            >
                +
            </button>
        </div>
    );
};

export default CourseManager;
