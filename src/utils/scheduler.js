export const DAYS_OF_WEEK = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

/**
 * Calculates the schedule for courses.
 * 
 * @param {Array<{name: string, sections: number[], startOffset: number}>} courses 
 * @param {Object<string, number>} dayLimits - e.g. { mon: 120, tue: 60 ... }
 * @param {number} marginOfError - minutes
 * @param {string} startDay - 'mon' (default)
 * @param {Date} startDate - Actual start date object
 * @returns {Array<{dayIndex: number, date: string, dayName: string, sections: Array}>}
 */
export function calculateSchedule(courses, dayLimits, marginOfError = 0, startDay = 'mon', startDate = new Date()) {
    const schedule = [];

    // Initialize progress cursors based on provided start offsets.
    const cursors = courses.map(c => c.startOffset || 0);

    let currentDayIndex = 0;
    let allDone = false;

    // Prevent infinite loops (limit to 2 years).
    const MAX_DAYS = 365 * 2;

    // Determine global limits to identify sections that exceed the maximum capacity of any single day.
    const values = Object.values(dayLimits).filter(v => v > 0);
    const maxGlobalLimit = Math.max(...values);
    const minGlobalLimit = values.length > 0 ? Math.min(...values) : 0;

    // Queue for split section remainders. 
    // If a course has items here, they take priority over new sections.
    const leftovers = courses.map(() => []);

    while (!allDone && currentDayIndex < MAX_DAYS) {
        const dayInfo = getDayInfo(currentDayIndex, startDay, startDate);
        const dayLimit = dayLimits[dayInfo.name] || 0;
        let remainingTime = dayLimit;
        const daysSections = [];

        while (true) {
            // Identify schedulable sections
            const candidates = [];

            for (let i = 0; i < courses.length; i++) {
                // 1. Check specific course leftovers
                if (leftovers[i].length > 0) {
                    candidates.push({
                        courseIndex: i,
                        courseName: courses[i].name,
                        section: leftovers[i][0], 
                        isLeftover: true
                    });
                    continue;
                }

                // 2. Check next available standard section
                const sectionIdx = cursors[i];
                if (sectionIdx < courses[i].sections.length) {
                    const duration = courses[i].sections[sectionIdx];
                    candidates.push({
                        courseIndex: i,
                        courseName: courses[i].name,
                        section: { duration: duration, label: (sectionIdx + 1).toString() },
                        isLeftover: false
                    });
                }
            }

            if (candidates.length === 0) {
                // Verify strict completion: all cursors at end and no leftovers.
                const trulyDone = courses.every((c, idx) =>
                    cursors[idx] >= c.sections.length && leftovers[idx].length === 0
                );
                if (trulyDone) allDone = true;
                break;
            }

            // Categorize candidates based on fit relative to current day limits.
            const processable = candidates.map(c => {
                const dur = c.section.duration;
                const fits = dur <= remainingTime;
                const fitsMargin = dur <= (remainingTime + marginOfError);
                const isGiant = dur > (dayLimit + marginOfError); // Exceeds this specific day's capacity

                return { ...c, fits, fitsMargin, isGiant };
            });

            // Priority 1: Finish leftovers/split sections before starting new ones.
            let activeCandidates = processable;
            if (activeCandidates.some(p => p.isLeftover)) {
                activeCandidates = activeCandidates.filter(p => p.isLeftover);
            }

            // Priority 2: Standard fit (exact or within margin).
            // Sort by duration descending to maximize fit.
            const fitting = activeCandidates.filter(p => p.fits || p.fitsMargin);

            if (fitting.length > 0) {
                fitting.sort((a, b) => b.section.duration - a.section.duration);
                const best = fitting[0];

                // Commit section to schedule
                daysSections.push({
                    courseName: best.courseName,
                    sectionLabel: best.section.label,
                    duration: best.section.duration,
                    courseIndex: best.courseIndex,
                    colorIndex: best.courseIndex % 10
                });

                remainingTime -= best.section.duration;
                if (best.isLeftover) {
                    leftovers[best.courseIndex].shift();
                } else {
                    cursors[best.courseIndex]++;
                }

                if (remainingTime < 0) break; // Margin consumed, day complete.
                continue;
            }

            // Priority 3: Handle oversized sections ("Giants").
            // These are sections larger than the minimum global limit.
            const startableGiants = activeCandidates.filter(p => !p.isLeftover);
            const giant = startableGiants.find(p => p.section.duration > (minGlobalLimit + marginOfError));

            if (giant) {
                // Constraint: Oversized sections must start on an empty day (no other sections scheduled yet).
                if (remainingTime >= dayLimit) {
                    // Fill the current day with the first part of the section.
                    const take = Math.min(remainingTime, giant.section.duration);

                    const part1Duration = take;
                    const remainderDuration = giant.section.duration - take;

                    const labels = generateSplitLabels(giant.section.label);

                    daysSections.push({
                        courseName: giant.courseName,
                        sectionLabel: labels.current,
                        duration: part1Duration,
                        courseIndex: giant.courseIndex,
                        colorIndex: giant.courseIndex % 10
                    });
                    remainingTime -= part1Duration;

                    // Queue the remainder.
                    leftovers[giant.courseIndex].unshift({
                        duration: remainderDuration,
                        label: labels.next
                    });

                    cursors[giant.courseIndex]++;
                    break; // Day full
                }
            }

            // Priority 4: Force split logic.
            // If only leftovers remain and they don't fit, split them again to utilize remaining time.
            const potentialGiants = activeCandidates.filter(p => !p.isLeftover);

            if (potentialGiants.length === 0) {
                if (leftovers.some(l => l.length > 0)) {
                    const lCand = activeCandidates.find(p => p.isLeftover);
                    if (lCand) {
                        // Skip insignificant time slots.
                        if (remainingTime <= marginOfError) break; 

                        const take = remainingTime;
                        const labels = generateSplitLabels(lCand.section.label);
                        const part1 = { ...lCand.section, label: labels.current, duration: take };
                        const part2 = { ...lCand.section, label: labels.next, duration: lCand.section.duration - take };

                        // Commit Part 1
                        daysSections.push({
                            courseName: lCand.courseName,
                            sectionLabel: part1.label,
                            duration: part1.duration,
                            courseIndex: lCand.courseIndex,
                            colorIndex: lCand.courseIndex % 10
                        });
                        remainingTime = 0;

                        // Update leftover queue: Replace head with Part 2
                        leftovers[lCand.courseIndex][0] = part2;
                        break;
                    }
                }
                break; // Move to next day
            }

            // If candidates exist but don't fit current remaining time, wait for next day.
            break;
        }

        if (!allDone || daysSections.length > 0) {
            schedule.push({
                dayIndex: currentDayIndex + 1,
                date: dayInfo.dateString,
                rawDate: dayInfo.rawDate,
                dayName: dayInfo.name,
                sections: daysSections,
                totalDuration: dayLimit - remainingTime
            });
        }

        if (!allDone) {
            currentDayIndex++;
        }
    }

    return schedule;
}

function getDayInfo(dayIndex, startDayStr, startDateObj) {
    const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

    const date = new Date(startDateObj);
    date.setDate(date.getDate() + dayIndex);

    const dayNum = date.getDay();
    const name = DAYS[dayNum];

    return {
        name: name,
        dateString: date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
        rawDate: date 
    };
}

function generateSplitLabels(label) {
    // Detect existing "Part X" suffix to increment correctly.
    const match = label.match(/^(.*?)\s*\(Part\s*(\d+).*\)$/);
    if (match) {
        const base = match[1];
        const currentNum = parseInt(match[2], 10);
        return {
            current: `${base} (Part ${currentNum})`,
            next: `${base} (Part ${currentNum + 1})`
        };
    }
    // Default to Part 1/2 split.
    return {
        current: `${label} (Part 1)`,
        next: `${label} (Part 2)`
    };
}